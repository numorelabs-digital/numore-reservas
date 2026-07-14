-- ============================================================
-- DEPLOY COMPLETO — pegá TODO esto en el SQL Editor de Supabase
-- (crea tablas, funciones, seguridad y datos de ejemplo)
-- ============================================================

-- =============================================================================
-- SISTEMA DE CLASES Y RESERVAS — Esquema inicial (PostgreSQL / Supabase)
-- Modalidades: flexible (cualquier horario, 24h antelación, vence a 30 días)
--              fixed_days (solo días elegidos)
-- Pagos: carga manual por admin. WhatsApp: vía NotificationService (app).
-- =============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "citext";         -- emails case-insensitive

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type user_role         as enum ('student', 'admin');
create type package_modality  as enum ('flexible', 'fixed_days');
create type purchase_status   as enum ('active', 'expired', 'depleted', 'cancelled');
create type session_status    as enum ('open', 'blocked', 'cancelled');
create type booking_status    as enum ('booked', 'attended', 'cancelled', 'no_show');
create type qr_status         as enum ('valid', 'used', 'expired');
create type redemption_status as enum ('pending', 'delivered', 'cancelled');
create type notif_event       as enum ('new_booking','reschedule','cancellation','new_user','contact_request');
create type notif_status      as enum ('pending', 'sent', 'failed');

-- ---------------------------------------------------------------------------
-- PROFILES  (1:1 con auth.users de Supabase)
-- ---------------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         citext unique not null,
  full_name     text,
  avatar_url    text,
  phone         text,
  role          user_role not null default 'student',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CLASS TYPES  (Muay Thai, MMA, Boxeo, ...)
-- ---------------------------------------------------------------------------
create table class_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text default '#ef4444',   -- para el calendario
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- SCHEDULES  (plantilla recurrente por día de semana)
--   Genera class_sessions concretas por fecha.
-- ---------------------------------------------------------------------------
create table schedules (
  id             uuid primary key default gen_random_uuid(),
  class_type_id  uuid not null references class_types(id) on delete restrict,
  weekday        int  not null check (weekday between 0 and 6),  -- 0=domingo
  start_time     time not null,
  end_time       time not null,
  capacity       int  not null check (capacity between 1 and 200),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_time > start_time)
);

-- ---------------------------------------------------------------------------
-- CLASS SESSIONS  (instancia concreta de una clase en una fecha)
--   capacity se copia del schedule pero puede overridearse por sesión.
-- ---------------------------------------------------------------------------
create table class_sessions (
  id             uuid primary key default gen_random_uuid(),
  schedule_id    uuid references schedules(id) on delete set null,
  class_type_id  uuid not null references class_types(id) on delete restrict,
  session_date   date not null,
  start_time     time not null,
  end_time       time not null,
  capacity       int  not null check (capacity between 1 and 200),
  status         session_status not null default 'open',
  created_at     timestamptz not null default now(),
  unique (schedule_id, session_date)
);
create index idx_sessions_date on class_sessions(session_date);

-- ---------------------------------------------------------------------------
-- PACKAGES  (catálogo de paquetes de 2 a 24 clases)
-- ---------------------------------------------------------------------------
create table packages (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  modality       package_modality not null,
  classes_count  int  not null check (classes_count between 2 and 24),
  price          numeric(10,2) not null default 0,
  validity_days  int  not null default 30,   -- flexible vence a 30 días
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PACKAGE PURCHASES  (compra/asignación manual a un alumno)
--   fixed_days: allowed_weekdays = días elegidos (p.ej. {1,3} lun+mié)
-- ---------------------------------------------------------------------------
create table package_purchases (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references profiles(id) on delete cascade,
  package_id       uuid not null references packages(id) on delete restrict,
  modality         package_modality not null,
  classes_total    int  not null check (classes_total between 2 and 24),
  allowed_weekdays int[] default null,        -- solo fixed_days
  starts_at        timestamptz not null default now(),
  expires_at       timestamptz not null,      -- flexible: +30d
  status           purchase_status not null default 'active',
  created_by       uuid references profiles(id),  -- admin que la cargó
  created_at       timestamptz not null default now()
);
create index idx_purchases_profile on package_purchases(profile_id) where status = 'active';

-- ---------------------------------------------------------------------------
-- BOOKINGS  (reserva; consume 1 crédito del purchase mientras esté activa)
-- ---------------------------------------------------------------------------
create table bookings (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  session_id   uuid not null references class_sessions(id) on delete cascade,
  purchase_id  uuid not null references package_purchases(id) on delete restrict,
  status       booking_status not null default 'booked',
  created_at   timestamptz not null default now(),
  cancelled_at timestamptz,
  -- Un alumno no puede tener 2 reservas activas en la misma sesión.
  -- (índice parcial único más abajo, para permitir re-reservar tras cancelar)
  constraint uq_booking unique (id)
);
create unique index uq_booking_active
  on bookings(session_id, profile_id)
  where status in ('booked', 'attended');
create index idx_bookings_session on bookings(session_id) where status = 'booked';
create index idx_bookings_profile on bookings(profile_id);

-- ---------------------------------------------------------------------------
-- QR TOKENS  (uno por reserva; un solo uso; expira al terminar la clase)
-- ---------------------------------------------------------------------------
create table qr_tokens (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references bookings(id) on delete cascade,
  token       uuid not null unique default gen_random_uuid(),
  valid_from  timestamptz not null,
  valid_until timestamptz not null,
  status      qr_status not null default 'valid',
  used_at     timestamptz,
  used_by     uuid references profiles(id),  -- admin que escaneó
  created_at  timestamptz not null default now()
);
create index idx_qr_token on qr_tokens(token);

-- ---------------------------------------------------------------------------
-- ATTENDANCES  (registro de asistencia tras validar el QR)
-- ---------------------------------------------------------------------------
create table attendances (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null unique references bookings(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  session_id   uuid not null references class_sessions(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_by   uuid references profiles(id)
);

-- ---------------------------------------------------------------------------
-- POINTS LEDGER  (libro mayor; balance = sum(delta))
-- ---------------------------------------------------------------------------
create table points_ledger (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  delta       int not null,             -- +1 asistencia, -N canje
  reason      text not null,            -- 'attendance' | 'redemption' | 'adjustment'
  ref_id      uuid,                     -- booking_id / redemption_id
  created_at  timestamptz not null default now()
);
create index idx_points_profile on points_ledger(profile_id);

-- ---------------------------------------------------------------------------
-- REWARDS  (productos canjeables)
-- ---------------------------------------------------------------------------
create table rewards (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  image_url     text,
  points_cost   int not null check (points_cost > 0),
  stock         int default null,       -- null = ilimitado
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- REDEMPTIONS  (canjes)
-- ---------------------------------------------------------------------------
create table redemptions (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  reward_id    uuid not null references rewards(id) on delete restrict,
  points_spent int not null,
  status       redemption_status not null default 'pending',
  created_at   timestamptz not null default now(),
  delivered_at timestamptz
);

-- ---------------------------------------------------------------------------
-- PROMOTIONS
-- ---------------------------------------------------------------------------
create table promotions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  image_url   text,
  starts_at   timestamptz,
  ends_at     timestamptz,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS  (cola de eventos a enviar por WhatsApp al admin)
-- ---------------------------------------------------------------------------
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  event       notif_event not null,
  payload     jsonb not null default '{}'::jsonb,
  status      notif_status not null default 'pending',
  error       text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index idx_notif_pending on notifications(status) where status = 'pending';

-- ---------------------------------------------------------------------------
-- SETTINGS  (config global clave/valor)
-- ---------------------------------------------------------------------------
create table settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
insert into settings (key, value) values
  ('booking_min_hours_ahead', '24'::jsonb),
  ('admin_whatsapp',          '""'::jsonb),
  ('points_per_attendance',   '1'::jsonb);

-- ---------------------------------------------------------------------------
-- AUDIT LOG
-- ---------------------------------------------------------------------------
create table audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references profiles(id),
  action      text not null,
  entity      text,
  entity_id   uuid,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index idx_audit_created on audit_logs(created_at desc);

-- =============================================================================
-- VISTAS DE APOYO
-- =============================================================================

-- Cupos en tiempo real por sesión
create or replace view session_availability as
select s.id as session_id,
       s.capacity,
       count(b.id) filter (where b.status in ('booked','attended')) as taken,
       greatest(s.capacity - count(b.id) filter (where b.status in ('booked','attended')), 0) as available,
       (s.status <> 'open'
        or count(b.id) filter (where b.status in ('booked','attended')) >= s.capacity) as is_full
from class_sessions s
left join bookings b on b.session_id = s.id
group by s.id;

-- Balance de puntos por alumno
create or replace view points_balance as
select profile_id, coalesce(sum(delta),0) as balance
from points_ledger
group by profile_id;

-- Clases restantes por compra activa
create or replace view purchase_remaining as
select p.id as purchase_id,
       p.profile_id,
       p.classes_total,
       p.classes_total - count(b.id) filter (where b.status in ('booked','attended')) as remaining,
       p.expires_at
from package_purchases p
left join bookings b on b.purchase_id = p.id
where p.status = 'active'
group by p.id;

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

-- =============================================================================
-- ROW LEVEL SECURITY
-- Regla general: el alumno solo ve/gestiona lo suyo; el admin ve/gestiona todo.
-- Las escrituras sensibles pasan por funciones SECURITY DEFINER (RPC), no por
-- INSERT/UPDATE directos, para garantizar concurrencia y validaciones.
-- =============================================================================

alter table profiles          enable row level security;
alter table class_types       enable row level security;
alter table schedules         enable row level security;
alter table class_sessions    enable row level security;
alter table packages          enable row level security;
alter table package_purchases enable row level security;
alter table bookings          enable row level security;
alter table qr_tokens         enable row level security;
alter table attendances       enable row level security;
alter table points_ledger     enable row level security;
alter table rewards           enable row level security;
alter table redemptions       enable row level security;
alter table promotions        enable row level security;
alter table notifications     enable row level security;
alter table settings          enable row level security;
alter table audit_logs        enable row level security;

-- PROFILES ------------------------------------------------------------------
create policy "profiles: self read"   on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles: self update" on profiles for update using (id = auth.uid() or is_admin());
create policy "profiles: admin all"   on profiles for all    using (is_admin()) with check (is_admin());

-- CATÁLOGO PÚBLICO (lectura para autenticados, escritura admin) ---------------
create policy "class_types read" on class_types for select using (auth.role() = 'authenticated');
create policy "class_types admin" on class_types for all using (is_admin()) with check (is_admin());

create policy "schedules read"  on schedules  for select using (auth.role() = 'authenticated');
create policy "schedules admin" on schedules  for all using (is_admin()) with check (is_admin());

create policy "sessions read"   on class_sessions for select using (auth.role() = 'authenticated');
create policy "sessions admin"  on class_sessions for all using (is_admin()) with check (is_admin());

create policy "packages read"   on packages for select using (auth.role() = 'authenticated');
create policy "packages admin"  on packages for all using (is_admin()) with check (is_admin());

create policy "rewards read"    on rewards for select using (auth.role() = 'authenticated');
create policy "rewards admin"   on rewards for all using (is_admin()) with check (is_admin());

create policy "promotions read" on promotions for select using (auth.role() = 'authenticated');
create policy "promotions admin" on promotions for all using (is_admin()) with check (is_admin());

-- DATOS DEL ALUMNO (solo lo suyo; admin todo) --------------------------------
create policy "purchases own"   on package_purchases for select using (profile_id = auth.uid() or is_admin());
create policy "purchases admin" on package_purchases for all using (is_admin()) with check (is_admin());

create policy "bookings own"    on bookings for select using (profile_id = auth.uid() or is_admin());
-- (INSERT/UPDATE de bookings solo vía RPC book/cancel/reschedule)

create policy "qr own"          on qr_tokens for select
  using (exists (select 1 from bookings b where b.id = booking_id and (b.profile_id = auth.uid() or is_admin())));

create policy "attendance own"  on attendances for select using (profile_id = auth.uid() or is_admin());

create policy "points own"      on points_ledger for select using (profile_id = auth.uid() or is_admin());

create policy "redemptions own" on redemptions for select using (profile_id = auth.uid() or is_admin());
create policy "redemptions admin" on redemptions for update using (is_admin()) with check (is_admin());

-- SOLO ADMIN ----------------------------------------------------------------
create policy "notifications admin" on notifications for all using (is_admin()) with check (is_admin());
create policy "settings read"  on settings for select using (auth.role() = 'authenticated');
create policy "settings admin" on settings for all using (is_admin()) with check (is_admin());
create policy "audit admin"    on audit_logs for select using (is_admin());

-- =============================================================================
-- WEB PUSH — suscripciones de notificaciones del navegador/PWA.
-- El admin se suscribe desde su celular; el worker envía a estos endpoints.
-- =============================================================================

create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index idx_push_profile on push_subscriptions(profile_id);

alter table push_subscriptions enable row level security;

-- Cada quien gestiona sus propias suscripciones (el admin, las suyas).
create policy "push own" on push_subscriptions for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- =============================================================================
-- SEED — datos de ejemplo para desarrollo.
-- Correr con: supabase db reset  (aplica migraciones + seed)
-- =============================================================================

-- Tipos de clase
insert into class_types (id, name, color) values
  ('11111111-1111-1111-1111-111111111111', 'Muay Thai', '#ef4444'),
  ('22222222-2222-2222-2222-222222222222', 'MMA',       '#3b82f6'),
  ('33333333-3333-3333-3333-333333333333', 'Boxeo',     '#f59e0b');

-- Horarios recurrentes (weekday: 0=dom … 6=sáb)
insert into schedules (class_type_id, weekday, start_time, end_time, capacity) values
  ('11111111-1111-1111-1111-111111111111', 1, '19:00', '20:00', 12), -- Lun Muay Thai
  ('11111111-1111-1111-1111-111111111111', 3, '19:00', '20:00', 12), -- Mié Muay Thai
  ('22222222-2222-2222-2222-222222222222', 2, '20:00', '21:00', 10), -- Mar MMA
  ('22222222-2222-2222-2222-222222222222', 4, '20:00', '21:00', 10), -- Jue MMA
  ('33333333-3333-3333-3333-333333333333', 5, '18:00', '19:00', 15), -- Vie Boxeo
  ('33333333-3333-3333-3333-333333333333', 6, '10:00', '11:00', 15); -- Sáb Boxeo

-- Genera sesiones concretas para los próximos 21 días a partir de los horarios
insert into class_sessions (schedule_id, class_type_id, session_date, start_time, end_time, capacity)
select s.id, s.class_type_id, d::date, s.start_time, s.end_time, s.capacity
from schedules s
cross join generate_series(current_date, current_date + 21, interval '1 day') as d
where extract(dow from d) = s.weekday
on conflict (schedule_id, session_date) do nothing;

-- Paquetes (2–24 clases)
insert into packages (name, modality, classes_count, price, validity_days) values
  ('Flex 10',        'flexible',   10, 25000, 30),
  ('Flex 15',        'flexible',   15, 33000, 30),
  ('Flex 20',        'flexible',   20, 40000, 30),
  ('Flex 24',        'flexible',   24, 45000, 30),
  ('Fijo 2 días',    'fixed_days',  8, 20000, 30),
  ('Fijo 3 días',    'fixed_days', 12, 28000, 30);

-- Recompensas
insert into rewards (name, description, points_cost, stock) values
  ('Botella Gimnasio', 'Botella deportiva 750ml',        8, 20),
  ('Remera',           'Remera de algodón con logo',    15, 15),
  ('Guantes',          'Guantes de boxeo 12oz',         40, 5),
  ('Toalla',           'Toalla de microfibra',          10, 25),
  ('Shorts',           'Shorts de Muay Thai',           35, 8),
  ('Protector bucal',  'Protector bucal moldeable',      6, 30);

-- NOTA: para probar como admin, registrate con Google y luego ejecutá:
--   update profiles set role='admin' where email='TU_EMAIL@gmail.com';
