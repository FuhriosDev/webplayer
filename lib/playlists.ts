import { supabase } from "./supabaseClient";
import type { Song } from "./song";

export type Playlist = {
  id: string;
  name: string;
  created_at: string;
};

export type PlaylistSongStatus = Playlist & {
  containsSong: boolean;
};

export type PlaylistSong = Song;

type SharedSong = {
  display_name: string;
  file_path: string;
};

export async function fetchPlaylists(): Promise<Playlist[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("Sign in to load your playlists.");

  const { data, error } = await supabase
    .from("playlists")
    .select("id, name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function fetchPlaylistsForSong(
  shareToken: string
): Promise<PlaylistSongStatus[]> {
  const playlists = await fetchPlaylists();
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
    .select("id, name, created_at")
    .single();

  if (error) throw error;

  return data;
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
  playlistId: string
): Promise<Playlist | null> {
  const { data, error } = await supabase
    .from("playlists")
    .select("id, name, created_at")
    .eq("id", playlistId)
    .maybeSingle();

  if (error) throw error;

  return data;
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