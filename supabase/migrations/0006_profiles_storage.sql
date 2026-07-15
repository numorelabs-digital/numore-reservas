-- =============================================================================
-- Perfil ampliado (nombre de usuario, ubicación) + Storage para fotos
-- =============================================================================

alter table profiles add column if not exists username text;
alter table profiles add column if not exists location text;   -- "Ciudad, UF"
alter table profiles add column if not exists cep text;

-- ---------------------------------------------------------------------------
-- Buckets de Storage (públicos para lectura; las subidas van por el servidor
-- con service-role, así no hacen falta políticas complejas en storage.objects)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('rewards', 'rewards', true)
on conflict (id) do nothing;
