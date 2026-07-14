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
