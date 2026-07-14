-- =============================================================================
-- FUNCIONES RPC — lógica de negocio atómica
-- Todo lo sensible a concurrencia usa SELECT ... FOR UPDATE sobre la sesión.
-- =============================================================================

-- Helper: ¿es admin el usuario actual?
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Helper: setting numérico
create or replace function setting_int(p_key text, p_default int)
returns int language sql stable set search_path = public as $$
  select coalesce((select (value::text)::int from settings where key = p_key), p_default);
$$;

-- ---------------------------------------------------------------------------
-- RESERVAR  (anti-doble-reserva + validación de paquete/modalidad)
-- ---------------------------------------------------------------------------
create or replace function book_session(p_session_id uuid, p_purchase_id uuid)
returns bookings
language plpgsql security definer set search_path = public as $$
declare
  v_uid        uuid := auth.uid();
  v_session    class_sessions%rowtype;
  v_purchase   package_purchases%rowtype;
  v_taken      int;
  v_remaining  int;
  v_min_hours  int := setting_int('booking_min_hours_ahead', 24);
  v_starts_at  timestamptz;
  v_booking    bookings%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  -- Bloqueo de la sesión para serializar cupos concurrentes
  select * into v_session from class_sessions where id = p_session_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_session.status <> 'open' then raise exception 'SESSION_NOT_OPEN'; end if;

  v_starts_at := (v_session.session_date + v_session.start_time) at time zone 'UTC';

  -- Antelación mínima (24h por defecto)
  if v_starts_at < now() + make_interval(hours => v_min_hours) then
    raise exception 'TOO_LATE_TO_BOOK';
  end if;

  -- Cupo disponible
  select count(*) into v_taken from bookings
    where session_id = p_session_id and status in ('booked','attended');
  if v_taken >= v_session.capacity then raise exception 'SESSION_FULL'; end if;

  -- Paquete válido y del alumno
  select * into v_purchase from package_purchases
    where id = p_purchase_id and profile_id = v_uid for update;
  if not found then raise exception 'PURCHASE_NOT_FOUND'; end if;
  if v_purchase.status <> 'active' then raise exception 'PURCHASE_INACTIVE'; end if;
  if v_purchase.expires_at < now() then raise exception 'PURCHASE_EXPIRED'; end if;

  -- Créditos restantes
  select v_purchase.classes_total - count(*) into v_remaining from bookings
    where purchase_id = p_purchase_id and status in ('booked','attended');
  if v_remaining <= 0 then raise exception 'NO_CLASSES_LEFT'; end if;

  -- Modalidad fixed_days: la sesión debe caer en un día permitido
  if v_purchase.modality = 'fixed_days' then
    if not (extract(dow from v_session.session_date)::int = any(v_purchase.allowed_weekdays)) then
      raise exception 'DAY_NOT_ALLOWED';
    end if;
  end if;

  -- Insertar reserva (el índice único parcial bloquea doble reserva por alumno)
  insert into bookings(profile_id, session_id, purchase_id)
  values (v_uid, p_session_id, p_purchase_id)
  returning * into v_booking;

  -- Generar QR (válido desde 30 min antes hasta el fin de la clase)
  insert into qr_tokens(booking_id, valid_from, valid_until)
  values (
    v_booking.id,
    (v_session.session_date + v_session.start_time) at time zone 'UTC' - interval '30 minutes',
    (v_session.session_date + v_session.end_time)   at time zone 'UTC'
  );

  -- Encolar notificación WhatsApp
  insert into notifications(event, payload)
  values ('new_booking', jsonb_build_object(
    'booking_id', v_booking.id, 'profile_id', v_uid, 'session_id', p_session_id));

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- CANCELAR  (libera cupo, invalida QR, encola notificación)
-- ---------------------------------------------------------------------------
create or replace function cancel_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_b bookings%rowtype;
begin
  select * into v_b from bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_b.profile_id <> v_uid and not is_admin() then raise exception 'FORBIDDEN'; end if;
  if v_b.status <> 'booked' then raise exception 'CANNOT_CANCEL'; end if;

  update bookings set status='cancelled', cancelled_at=now() where id = p_booking_id;
  update qr_tokens set status='expired' where booking_id = p_booking_id and status='valid';

  insert into notifications(event, payload)
  values ('cancellation', jsonb_build_object('booking_id', p_booking_id, 'profile_id', v_b.profile_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- CAMBIAR HORARIO  (libera anterior + ocupa nuevo, atómico)
-- ---------------------------------------------------------------------------
create or replace function reschedule_booking(p_booking_id uuid, p_new_session_id uuid)
returns bookings language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_old bookings%rowtype;
  v_new bookings%rowtype;
begin
  select * into v_old from bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_old.profile_id <> v_uid and not is_admin() then raise exception 'FORBIDDEN'; end if;
  if v_old.status <> 'booked' then raise exception 'CANNOT_RESCHEDULE'; end if;

  -- Cancela la anterior (libera cupo) e invalida su QR
  update bookings set status='cancelled', cancelled_at=now() where id = p_booking_id;
  update qr_tokens set status='expired' where booking_id = p_booking_id and status='valid';

  -- Reserva la nueva con el mismo paquete (reusa validaciones de cupo/modalidad)
  v_new := book_session(p_new_session_id, v_old.purchase_id);

  -- Reemplaza la notificación por una de cambio
  insert into notifications(event, payload)
  values ('reschedule', jsonb_build_object(
    'old_booking', p_booking_id, 'new_booking', v_new.id,
    'profile_id', v_uid, 'new_session', p_new_session_id));

  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- CHECK-IN POR QR  (solo admin; valida token, marca asistencia, suma punto)
--   Un solo uso garantizado por el UPDATE condicional sobre qr_tokens.
-- ---------------------------------------------------------------------------
create or replace function checkin_qr(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_qr    qr_tokens%rowtype;
  v_b     bookings%rowtype;
  v_pts   int := setting_int('points_per_attendance', 1);
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;

  select * into v_qr from qr_tokens where token = p_token for update;
  if not found then raise exception 'QR_INVALID'; end if;
  if v_qr.status = 'used' then raise exception 'QR_ALREADY_USED'; end if;
  if now() < v_qr.valid_from  then raise exception 'QR_NOT_YET_VALID'; end if;
  if now() > v_qr.valid_until then
    update qr_tokens set status='expired' where id = v_qr.id;
    raise exception 'QR_EXPIRED';
  end if;

  -- Consumir el QR de forma atómica (idempotencia real)
  update qr_tokens set status='used', used_at=now(), used_by=auth.uid()
    where id = v_qr.id and status='valid';
  if not found then raise exception 'QR_ALREADY_USED'; end if;

  select * into v_b from bookings where id = v_qr.booking_id for update;
  update bookings set status='attended' where id = v_b.id;

  insert into attendances(booking_id, profile_id, session_id, checked_by)
  values (v_b.id, v_b.profile_id, v_b.session_id, auth.uid());

  insert into points_ledger(profile_id, delta, reason, ref_id)
  values (v_b.profile_id, v_pts, 'attendance', v_b.id);

  return jsonb_build_object('ok', true, 'profile_id', v_b.profile_id, 'points_added', v_pts);
end;
$$;

-- ---------------------------------------------------------------------------
-- CANJEAR RECOMPENSA  (verifica saldo y stock, descuenta puntos)
-- ---------------------------------------------------------------------------
create or replace function redeem_reward(p_reward_id uuid)
returns redemptions language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_r   rewards%rowtype;
  v_bal int;
  v_red redemptions%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_r from rewards where id = p_reward_id for update;
  if not found or not v_r.is_active then raise exception 'REWARD_UNAVAILABLE'; end if;
  if v_r.stock is not null and v_r.stock <= 0 then raise exception 'OUT_OF_STOCK'; end if;

  select coalesce(sum(delta),0) into v_bal from points_ledger where profile_id = v_uid;
  if v_bal < v_r.points_cost then raise exception 'NOT_ENOUGH_POINTS'; end if;

  insert into redemptions(profile_id, reward_id, points_spent)
  values (v_uid, p_reward_id, v_r.points_cost) returning * into v_red;

  insert into points_ledger(profile_id, delta, reason, ref_id)
  values (v_uid, -v_r.points_cost, 'redemption', v_red.id);

  if v_r.stock is not null then
    update rewards set stock = stock - 1 where id = p_reward_id;
  end if;

  return v_red;
end;
$$;

-- ---------------------------------------------------------------------------
-- TRIGGER: crear profile automáticamente al registrarse (Google OAuth)
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  insert into public.notifications(event, payload)
  values ('new_user', jsonb_build_object('profile_id', new.id, 'email', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
