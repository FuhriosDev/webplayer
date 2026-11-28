import { supabase } from "./supabaseClient";
import type { Song } from "./song";
import { fetchPublicUsernames } from "./profiles";
import { fetchSharedSongs } from "./sharedSongs";

export async function fetchSongs(): Promise<Song[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error("Sign in to load your songs.");

  const userId = userData.user.id;

  const { data: ownedRows, error: ownedError } = await supabase
    .from("songs_meta")
    .select("file_path, display_name, share_token, user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (ownedError) {
    throw ownedError;
  }

  const ownedUsernames = await fetchPublicUsernames(
    (ownedRows ?? []).map((row) => row.user_id)
  );
  const ownedSongs: Song[] = (ownedRows ?? []).map((row) => ({
    name: row.display_name,
    url: supabase.storage.from("songs").getPublicUrl(row.file_path).data.publicUrl,
    filePath: row.file_path,
    shareToken: row.share_token,
    artist: ownedUsernames.get(row.user_id) ?? "Unknown user",
    isOwner: true,
  }));

  const { data: savedRows, error: savedError } = await supabase
    .from("saved_songs")
    .select("share_token")
    .eq("user_id", userId);

  if (savedError) {
    throw savedError;
  }

  const ownedTokens = new Set(ownedSongs.map((song) => song.shareToken));

  const savedTokens = (savedRows ?? [])
    .map((row) => row.share_token)
    .filter((token) => !ownedTokens.has(token));

  const sharedSongs = await fetchSharedSongs(savedTokens);
  const savedSongs = savedTokens.map((token) => {
    const song = sharedSongs.get(token);
    if (!song) {
      throw new Error("Could not load a saved song because it is unavailable.");
    }
    return { ...song, isOwner: false };
  });

  return [...ownedSongs, ...savedSongs];
}