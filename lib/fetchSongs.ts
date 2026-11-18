import { supabase } from "./supabaseClient";

type Song = {
  name: string;
  url: string;
  filePath: string;
  shareToken: string;
  isOwner: boolean;
};

type SharedSong = {
  display_name: string;
  file_path: string;
};

export async function fetchSongs(): Promise<Song[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    console.error("User not authenticated");
    return [];
  }

  const userId = userData.user.id;

  const { data: ownedRows, error: ownedError } = await supabase
    .from("songs_meta")
    .select("file_path, display_name, share_token")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (ownedError) {
    console.error("Error fetching owned songs:", ownedError.message);
    return [];
  }

  const ownedSongs: Song[] = (ownedRows ?? []).map((row) => ({
    name: row.display_name,
    url: supabase.storage.from("songs").getPublicUrl(row.file_path).data.publicUrl,
    filePath: row.file_path,
    shareToken: row.share_token,
    isOwner: true,
  }));

  const { data: savedRows, error: savedError } = await supabase
    .from("saved_songs")
    .select("share_token")
    .eq("user_id", userId);

  if (savedError) {
    console.error("Error fetching saved songs:", savedError.message);
    return ownedSongs;
  }

  const ownedTokens = new Set(ownedSongs.map((song) => song.shareToken));

  const savedTokens = (savedRows ?? [])
    .map((row) => row.share_token)
    .filter((token) => !ownedTokens.has(token));

  const savedSongs = await Promise.all(
    savedTokens.map(async (token): Promise<Song | null> => {
      try {
        const response = await fetch(`/api/share/${encodeURIComponent(token)}`);

        if (!response.ok) {
          return null;
        }

        const shared: SharedSong = await response.json();
        const publicUrl = supabase.storage
          .from("songs")
          .getPublicUrl(shared.file_path).data.publicUrl;

        return {
          name: shared.display_name,
          url: publicUrl,
          filePath: shared.file_path,
          shareToken: token,
          isOwner: false,
        };
      } catch (error) {
        console.error("Error loading saved song:", error);
        return null;
      }
    })
  );

  return [
    ...ownedSongs,
    ...savedSongs.filter((song): song is Song => song !== null),
  ];
}