import { supabase } from "./supabaseClient";
import type { Song } from "./song";

export type Playlist = {
  id: string;
  name: string;
  created_at: string;
  shareToken: string | null;
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

type SharedSong = {
  display_name: string;
  file_path: string;
};

type PlaylistRow = {
  id: string;
  name: string;
  created_at: string;
  share_token: string | null;
};

function toPlaylist(playlist: PlaylistRow): Playlist {
  return {
    id: playlist.id,
    name: playlist.name,
    created_at: playlist.created_at,
    shareToken: playlist.share_token,
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
    .select("id, name, created_at, share_token")
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

  if (savedIds.length === 0) return owned.map(toPlaylist);

  const { data: savedPlaylists, error: playlistsError } = await supabase
    .from("playlists")
    .select("id, name, created_at, share_token")
    .in("id", savedIds)
    .order("created_at", { ascending: false });

  if (playlistsError) throw playlistsError;

  return [
    ...owned.map(toPlaylist),
    ...(savedPlaylists ?? []).map((playlist) => ({
      ...toPlaylist(playlist),
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
    .select("id, name, created_at, share_token")
    .single();

  if (error) throw error;

  return toPlaylist(data);
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

  const songs = await Promise.all(
    (items ?? []).map(async (item): Promise<PlaylistSong> => {
      const response = await fetch(
        `/api/share/${encodeURIComponent(item.share_token)}`
      );

      if (!response.ok) {
        throw new Error(`Could not load playlist song (${response.status}).`);
      }

      const shared: SharedSong = await response.json();
      const url = supabase.storage
        .from("songs")
        .getPublicUrl(shared.file_path).data.publicUrl;

      return {
        name: shared.display_name,
        url,
        filePath: shared.file_path,
        shareToken: item.share_token,
      };
    })
  );

  return songs;
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
    .select("id, name, created_at, share_token")
    .eq("share_token", shareToken)
    .maybeSingle();

  if (shareError) throw shareError;
  if (sharedPlaylist) {
    return toPlaylist(sharedPlaylist);
  }

  const { data: ownedPlaylist, error: ownerError } = await supabase
    .from("playlists")
    .select("id, name, created_at, share_token")
    .eq("id", shareToken)
    .maybeSingle();

  if (ownerError) throw ownerError;

  return ownedPlaylist ? toPlaylist(ownedPlaylist) : null;
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