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
