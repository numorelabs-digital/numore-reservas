-- =============================================================================
-- PAGOS con Mercado Pago (PIX) + venta de tickets sueltos (1 clase)
-- =============================================================================

-- Permitir paquetes/compras desde 1 clase (antes mínimo 2)
alter table packages drop constraint if exists packages_classes_count_check;
alter table packages add constraint packages_classes_count_check
  check (classes_count between 1 and 24);

alter table package_purchases drop constraint if exists package_purchases_classes_total_check;
alter table package_purchases add constraint package_purchases_classes_total_check
  check (classes_total between 1 and 24);

-- ---------------------------------------------------------------------------
-- PAYMENTS — una fila por intento de compra vía Mercado Pago.
-- Al aprobarse (webhook), se crea el package_purchase y se acreditan tickets.
-- ---------------------------------------------------------------------------
create table payments (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  package_id     uuid not null references packages(id) on delete restrict,
  amount         numeric(10,2) not null,
  status         text not null default 'pending',  -- pending|approved|rejected|expired
  mp_payment_id  text unique,                       -- id del pago en Mercado Pago
  qr_code        text,                              -- PIX copia-e-cola
  qr_code_base64 text,                              -- imagen del QR (base64)
  purchase_id    uuid references package_purchases(id), -- se setea al acreditar
  created_at     timestamptz not null default now(),
  approved_at    timestamptz
);
create index idx_payments_profile on payments(profile_id);
create index idx_payments_mp on payments(mp_payment_id);

alter table payments enable row level security;

-- El alumno ve solo sus pagos. La creación/actualización va por el servidor
-- (server actions con su sesión, y el webhook con service-role que salta RLS).
create policy "payments own read" on payments for select
  using (profile_id = auth.uid() or is_admin());
create policy "payments own insert" on payments for insert
  with check (profile_id = auth.uid());
