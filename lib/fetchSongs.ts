import { supabase } from "./supabaseClient";

export async function fetchSongs() {
  // Get all files
  const { data: files, error: filesError } = await supabase.storage
    .from("songs")
    .list("uploads", { limit: 100, offset: 0 });

  if (filesError) {
    console.error("Error fetching songs:", filesError.message);
    return [];
  }

  // Get all metadata
  const { data: metas, error: metasError } = await supabase
    .from("songs_meta")
    .select("*");

  if (metasError) {
    console.error("Error fetching song metadata:", metasError.message);
    return [];
  }

  return (
    files
      ?.filter((item) => item.name)
      .map((item) => {
        const filePath = `uploads/${item.name}`;
        const meta = metas?.find((m) => m.file_path === filePath);
        return {
          name: meta?.display_name || item.name,
          url: supabase.storage.from("songs").getPublicUrl(filePath).data.publicUrl,
        };
      }) ?? []
  );
}