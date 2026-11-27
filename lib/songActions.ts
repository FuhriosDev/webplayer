import { supabase } from "./supabaseClient";

export async function fetchSavedSongTokens(
  userId: string,
  shareTokens: string[]
): Promise<Set<string>> {
  if (shareTokens.length === 0) return new Set();

  const { data, error } = await supabase
    .from("saved_songs")
    .select("share_token")
    .eq("user_id", userId)
    .in("share_token", shareTokens);

  if (error) throw error;

  return new Set((data ?? []).map((row) => row.share_token));
}

export async function saveSong(
  userId: string,
  shareToken: string
): Promise<void> {
  const { error } = await supabase.from("saved_songs").insert({
    user_id: userId,
    share_token: shareToken,
  });

  if (error?.code === "23505") return;
  if (error) throw error;
}

export async function renameSong(
  filePath: string,
  newName: string
): Promise<void> {
  const { error } = await supabase
    .from("songs_meta")
    .update({ display_name: newName })
    .eq("file_path", filePath);

  if (error) throw error;
}

export async function deleteSong(filePath: string): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from("songs")
    .remove([filePath]);

  if (storageError) throw storageError;

  const { error: metadataError } = await supabase
    .from("songs_meta")
    .delete()
    .eq("file_path", filePath);

  if (metadataError) throw metadataError;
}

export async function unsaveSong(
  userId: string,
  shareToken: string
): Promise<void> {
  const { data, error } = await supabase
    .from("saved_songs")
    .delete()
    .eq("user_id", userId)
    .eq("share_token", shareToken)
    .select("share_token");

  if (error) throw error;
  if (!data?.length) throw new Error("No saved song was removed.");
}
