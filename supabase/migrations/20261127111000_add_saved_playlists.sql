do $migration$
declare
  playlist_id_type text;
begin
  select format_type(attribute.atttypid, attribute.atttypmod)
  into playlist_id_type
  from pg_attribute as attribute
  where attribute.attrelid = 'public.playlists'::regclass
    and attribute.attname = 'id'
    and not attribute.attisdropped;

  if playlist_id_type is null then
    raise exception 'Could not determine public.playlists.id type';
  end if;

  execute format(
    'create table if not exists public.saved_playlists (
      user_id uuid not null references auth.users(id) on delete cascade,
      playlist_id %s not null references public.playlists(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (user_id, playlist_id)
    )',
    playlist_id_type
  );
end;
$migration$;

alter table public.saved_playlists enable row level security;

drop policy if exists "Users can view their saved playlists"
  on public.saved_playlists;
create policy "Users can view their saved playlists"
  on public.saved_playlists
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can save playlists"
  on public.saved_playlists;
create policy "Users can save playlists"
  on public.saved_playlists
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can unsave their playlists"
  on public.saved_playlists;
create policy "Users can unsave their playlists"
  on public.saved_playlists
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.saved_playlists to authenticated;

notify pgrst, 'reload schema';
