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
