import { supabase } from "./supabaseClient";
import type { Song } from "./song";

type SharedSongRow = {
  share_token: string;
  display_name: string;
  file_path: string;
  uploader_username: string;
};

export async function fetchSharedSongs(
  shareTokens: string[]
): Promise<Map<string, Song>> {
  const uniqueTokens = [...new Set(shareTokens)];
  if (uniqueTokens.length === 0) return new Map();

  const songs = new Map<string, Song>();
  for (let offset = 0; offset < uniqueTokens.length; offset += 500) {
    const response = await fetch("/api/share/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shareTokens: uniqueTokens.slice(offset, offset + 500),
      }),
    });

    if (!response.ok) {
      throw new Error(`Could not load shared songs (${response.status}).`);
    }

    const result: { songs: SharedSongRow[] } = await response.json();
    for (const row of result.songs) {
      songs.set(row.share_token, {
        name: row.display_name,
        url: supabase.storage
          .from("songs")
          .getPublicUrl(row.file_path).data.publicUrl,
        filePath: row.file_path,
        shareToken: row.share_token,
        artist: row.uploader_username,
      });
    }
  }

  return songs;
}
