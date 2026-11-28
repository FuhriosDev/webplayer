import { supabase } from "./supabaseClient";
import type { Song } from "./song";
import { fetchPublicUsernames } from "./profiles";
import { fetchSharedSongs } from "./sharedSongs";

export type Playlist = {
  id: string;
  name: string;
  created_at: string;
  shareToken: string | null;
  creatorUsername?: string;
  isSaved?: boolean;
};

export type PlaylistSongStatus = Playlist & {
  containsSong: boolean;
};

export type PlaylistSaveStatus = {
  isOwner: boolean;
  isSaved: boolean;
};

export type PlaylistSong = Song;

type PlaylistRow = {
  id: string;
  name: string;
  created_at: string;
  share_token: string | null;
  user_id: string;
};

function toPlaylist(
  playlist: PlaylistRow,
  creatorUsername?: string
): Playlist {
  return {
    id: playlist.id,
    name: playlist.name,
    created_at: playlist.created_at,
    shareToken: playlist.share_token,
    creatorUsername,
  };
}

export async function fetchPlaylists(): Promise<Playlist[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("Sign in to load your playlists.");

  const { data: ownedPlaylists, error: ownedError } = await supabase
    .from("playlists")
    .select("id, name, created_at, share_token, user_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (ownedError) throw ownedError;

  const { data: savedRows, error: savedError } = await supabase
    .from("saved_playlists")
    .select("playlist_id")
    .eq("user_id", user.id);

  if (savedError) throw savedError;

  const owned = ownedPlaylists ?? [];
  const ownedIds = new Set(owned.map((playlist) => playlist.id));
  const savedIds = [
    ...new Set(
      (savedRows ?? [])
        .map((row) => row.playlist_id)
        .filter((id) => !ownedIds.has(id))
    ),
  ];

  let savedPlaylists: PlaylistRow[] = [];
  if (savedIds.length > 0) {
    const { data, error: playlistsError } = await supabase
      .from("playlists")
      .select("id, name, created_at, share_token, user_id")
      .in("id", savedIds)
      .order("created_at", { ascending: false });

    if (playlistsError) throw playlistsError;
    savedPlaylists = data ?? [];
  }

  const allPlaylists = [...owned, ...savedPlaylists];
  const usernames = await fetchPublicUsernames(
    allPlaylists.map((playlist) => playlist.user_id)
  );
  return [
    ...owned.map((playlist) =>
      toPlaylist(playlist, usernames.get(playlist.user_id) ?? "Unknown user")
    ),
    ...savedPlaylists.map((playlist) => ({
      ...toPlaylist(playlist, usernames.get(playlist.user_id) ?? "Unknown user"),
      isSaved: true,
    })),
  ];
}

export async function fetchPlaylistSaveStatus(
  playlistId: string,
  userId: string
): Promise<PlaylistSaveStatus> {
  const [ownerResult, savedResult] = await Promise.all([
    supabase
      .from("playlists")
      .select("id")
      .eq("id", playlistId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("saved_playlists")
      .select("playlist_id")
      .eq("playlist_id", playlistId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (ownerResult.error) throw ownerResult.error;
  if (savedResult.error) throw savedResult.error;

  return {
    isOwner: Boolean(ownerResult.data),
    isSaved: Boolean(savedResult.data),
  };
}

export async function savePlaylist(
  playlistId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase.from("saved_playlists").insert({
    playlist_id: playlistId,
    user_id: userId,
  });

  if (error?.code === "23505") {
    throw new Error("This playlist is already in your library.");
  }
  if (error) throw error;
}

export async function ensurePlaylistShareToken(
  playlistId: string
): Promise<string> {
  const { data: current, error: lookupError } = await supabase
    .from("playlists")
    .select("share_token")
    .eq("id", playlistId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (current?.share_token) return current.share_token;

  const shareToken = crypto.randomUUID();
  const { data: updated, error: updateError } = await supabase
    .from("playlists")
    .update({ share_token: shareToken })
    .eq("id", playlistId)
    .is("share_token", null)
    .select("share_token")
    .maybeSingle();

  if (updateError) throw updateError;
  if (updated?.share_token) return updated.share_token;

  const { data: latest, error: latestError } = await supabase
    .from("playlists")
    .select("share_token")
    .eq("id", playlistId)
    .maybeSingle();

  if (latestError) throw latestError;
  if (!latest?.share_token) {
    throw new Error("Could not create a share link for this playlist.");
  }

  return latest.share_token;
}

export async function unsavePlaylist(
  playlistId: string,
  userId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("saved_playlists")
    .delete()
    .eq("playlist_id", playlistId)
    .eq("user_id", userId)
    .select("playlist_id");

  if (error) throw error;
  if (!data?.length) throw new Error("No saved playlist was removed.");
}

export async function fetchPlaylistsForSong(
  shareToken: string
): Promise<PlaylistSongStatus[]> {
  const playlists = (await fetchPlaylists()).filter(
    (playlist) => !playlist.isSaved
  );
  if (playlists.length === 0) return [];

  const { data, error } = await supabase
    .from("playlist_items")
    .select("playlist_id")
    .eq("share_token", shareToken)
    .in(
      "playlist_id",
      playlists.map((playlist) => playlist.id)
    );

  if (error) throw error;

  const playlistIds = new Set((data ?? []).map((item) => item.playlist_id));
  return playlists.map((playlist) => ({
    ...playlist,
    containsSong: playlistIds.has(playlist.id),
  }));
}

export async function createPlaylist(rawName: string): Promise<Playlist> {
  const name = rawName.trim();

  if (!name) {
    throw new Error("Enter a playlist name.");
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("Sign in to create a playlist.");

  const { data, error } = await supabase
    .from("playlists")
    .insert({ user_id: user.id, name })
    .select("id, name, created_at, share_token, user_id")
    .single();

  if (error) throw error;

  const usernames = await fetchPublicUsernames([data.user_id]);
  return toPlaylist(data, usernames.get(data.user_id) ?? "Unknown user");
}

export async function fetchPlaylistSongs(
  playlistId: string
): Promise<PlaylistSong[]> {
  const { data: items, error } = await supabase
    .from("playlist_items")
    .select("share_token, position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });

  if (error) throw error;

  const tokens = (items ?? []).map((item) => item.share_token);
  const sharedSongs = await fetchSharedSongs(tokens);
  return tokens.map((token) => {
    const song = sharedSongs.get(token);
    if (!song) {
      throw new Error("Could not load a playlist song because it is unavailable.");
    }
    return song;
  });
}

export async function addSongToPlaylist(
  playlistId: string,
  shareToken: string
): Promise<void> {
  const { data: lastItem, error: positionError } = await supabase
    .from("playlist_items")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (positionError) throw positionError;

  const nextPosition = (lastItem?.position ?? -1) + 1;

  const { error } = await supabase.from("playlist_items").insert({
    playlist_id: playlistId,
    share_token: shareToken,
    position: nextPosition,
  });

  if (error?.code === "23505") {
    throw new Error("This song is already in this playlist.");
  }
  if (error) throw error;
}

export async function removeSongFromPlaylist(
  playlistId: string,
  shareToken: string
): Promise<void> {
  const { error } = await supabase.rpc(
    "remove_playlist_song_and_compact",
    {
      p_playlist_id: playlistId,
      p_share_token: shareToken,
    }
  );

  if (error) throw error;
}

export async function renamePlaylist(
  playlistId: string,
  name: string
): Promise<void> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Playlist name cannot be empty.");
  }

  const { error } = await supabase
    .from("playlists")
    .update({ name: trimmedName })
    .eq("id", playlistId);

  if (error) throw error;
}

export async function deletePlaylist(
  playlistId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", playlistId)
    .select("id");

  if (error) throw error;

  if (!data?.length) {
    throw new Error("No playlist was deleted.");
  }
}

export async function fetchPlaylist(
  shareToken: string
): Promise<Playlist | null> {
  const { data: sharedPlaylist, error: shareError } = await supabase
    .from("playlists")
    .select("id, name, created_at, share_token, user_id")
    .eq("share_token", shareToken)
    .maybeSingle();

  if (shareError) throw shareError;
  if (sharedPlaylist) {
    const usernames = await fetchPublicUsernames([sharedPlaylist.user_id]);
    return toPlaylist(
      sharedPlaylist,
      usernames.get(sharedPlaylist.user_id) ?? "Unknown user"
    );
  }

  const { data: ownedPlaylist, error: ownerError } = await supabase
    .from("playlists")
    .select("id, name, created_at, share_token, user_id")
    .eq("id", shareToken)
    .maybeSingle();

  if (ownerError) throw ownerError;

  if (!ownedPlaylist) return null;
  const usernames = await fetchPublicUsernames([ownedPlaylist.user_id]);
  return toPlaylist(
    ownedPlaylist,
    usernames.get(ownedPlaylist.user_id) ?? "Unknown user"
  );
}

export async function reorderPlaylistSongs(
  playlistId: string,
  orderedShareTokens: string[]
): Promise<void> {
  const { error } = await supabase.rpc("reorder_playlist_songs", {
    p_playlist_id: playlistId,
    p_share_tokens: orderedShareTokens,
  });

  if (error) throw error;
}