import { supabase } from "./supabaseClient";

export async function fetchSongs() {
  const { data, error } = await supabase.storage
    .from("songs")
    .list("uploads", { limit: 100, offset: 0 });

  if (error) {
    console.error("Error fetching songs:", error.message);
    return [];
  }

  return (
    data
      ?.filter((item) => item.name)
      .map((item) => ({
        name: item.name,
        url: supabase.storage.from("songs").getPublicUrl(`uploads/${item.name}`).data.publicUrl,
      })) ?? []
  );
}