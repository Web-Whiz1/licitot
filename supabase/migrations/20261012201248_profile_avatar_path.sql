-- Avatars are ImageKit files uploaded to /licitot/avatars/<user id>/…
-- A user can only point their avatar at a file in their own folder.
alter table public.profiles
  add constraint profiles_avatar_path_owner check (
    avatar_path is null
    or avatar_path like '/licitot/avatars/' || id::text || '/%'
  );
