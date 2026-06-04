import { supabase } from "./supabaseClient";

export async function fetchSongs() {
  // Get the authenticated user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData.user) {
    console.error("User not authenticated");
    return [];
  }

  // Fetch user's songs from songs_meta table ordered by created_at
  const { data: songs, error: songsError } = await supabase
    .from("songs_meta")
    .select("file_path, display_name")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (songsError) {
    console.error("Error fetching songs:", songsError.message);
    return [];
  }

  // Map metadata rows to playable songs
  return songs?.map((song) => ({
    name: song.display_name,
    url: supabase.storage.from("songs").getPublicUrl(song.file_path).data.publicUrl,
    filePath: song.file_path,
  })) ?? [];
}