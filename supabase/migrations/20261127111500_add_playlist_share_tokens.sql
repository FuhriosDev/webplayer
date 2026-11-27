alter table public.playlists
  add column if not exists share_token uuid;

create unique index if not exists playlists_share_token_unique_idx
  on public.playlists (share_token)
  where share_token is not null;

drop policy if exists "Anyone can view shared playlists"
  on public.playlists;
create policy "Anyone can view shared playlists"
  on public.playlists
  for select
  to anon, authenticated
  using (share_token is not null);

drop policy if exists "Anyone can view songs in shared playlists"
  on public.playlist_items;
create policy "Anyone can view songs in shared playlists"
  on public.playlist_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.playlists
      where public.playlists.id = playlist_items.playlist_id
        and public.playlists.share_token is not null
    )
  );

grant select on public.playlists to anon, authenticated;
grant select on public.playlist_items to anon, authenticated;

notify pgrst, 'reload schema';
