import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const pageSize = 1000;
const deleteBatchSize = 500;
const noStoreHeaders = { "Cache-Control": "no-store" };

type SongRow = {
  file_path: string;
  share_token: string;
};

type PlaylistRow = {
  id: string;
};

type ReferenceTable = "playlist_items" | "saved_songs" | "saved_playlists";
type ReferenceColumn = "playlist_id" | "share_token";

function getErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function fetchOwnedSongs(
  admin: SupabaseClient,
  userId: string
): Promise<SongRow[]> {
  const rows: SongRow[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin
      .from("songs_meta")
      .select("file_path, share_token")
      .eq("user_id", userId)
      .order("file_path", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) return rows;
  }
}

async function fetchOwnedPlaylists(
  admin: SupabaseClient,
  userId: string
): Promise<PlaylistRow[]> {
  const rows: PlaylistRow[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin
      .from("playlists")
      .select("id")
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) return rows;
  }
}

async function listOwnedAudioPaths(
  admin: SupabaseClient,
  userId: string
): Promise<string[]> {
  const prefix = `uploads/${userId}`;
  const paths = new Set<string>();

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin.storage
      .from("songs")
      .list(prefix, { limit: pageSize, offset });

    if (error) throw error;
    for (const object of data ?? []) {
      if (object.id) paths.add(`${prefix}/${object.name}`);
    }

    if ((data ?? []).length < pageSize) return [...paths];
  }
}

async function deleteReferences(
  admin: SupabaseClient,
  table: ReferenceTable,
  column: ReferenceColumn,
  values: string[]
) {
  for (const batch of chunks(values, deleteBatchSize)) {
    const { error } = await admin.from(table).delete().in(column, batch);
    if (error) throw error;
  }
}

async function deleteAccountData(
  admin: SupabaseClient,
  userId: string,
  setStage: (stage: string) => void
) {
  setStage("loading account data");
  const [songs, playlists] = await Promise.all([
    fetchOwnedSongs(admin, userId),
    fetchOwnedPlaylists(admin, userId),
  ]);
  const songTokens = [...new Set(songs.map((song) => song.share_token))];
  const playlistIds = playlists.map((playlist) => playlist.id);
  const userFolder = `uploads/${userId}/`;
  const audioPaths = new Set(await listOwnedAudioPaths(admin, userId));

  for (const song of songs) {
    if (
      song.file_path.startsWith(userFolder) &&
      !song.file_path.split("/").some((part) => part === "." || part === "..")
    ) {
      audioPaths.add(song.file_path);
    }
  }

  setStage("removing uploaded audio");
  for (const batch of chunks([...audioPaths], deleteBatchSize)) {
    const { error } = await admin.storage.from("songs").remove(batch);
    if (error) throw error;
  }

  setStage("removing playlist references");
  await deleteReferences(admin, "playlist_items", "playlist_id", playlistIds);
  await deleteReferences(admin, "playlist_items", "share_token", songTokens);

  setStage("removing saved items");
  const { error: savedSongsError } = await admin
    .from("saved_songs")
    .delete()
    .eq("user_id", userId);
  if (savedSongsError) throw savedSongsError;
  await deleteReferences(admin, "saved_songs", "share_token", songTokens);

  const { error: savedPlaylistsError } = await admin
    .from("saved_playlists")
    .delete()
    .eq("user_id", userId);
  if (savedPlaylistsError) throw savedPlaylistsError;
  await deleteReferences(
    admin,
    "saved_playlists",
    "playlist_id",
    playlistIds
  );

  setStage("removing owned content");
  const { error: playlistsError } = await admin
    .from("playlists")
    .delete()
    .eq("user_id", userId);
  if (playlistsError) throw playlistsError;

  const { error: songsError } = await admin
    .from("songs_meta")
    .delete()
    .eq("user_id", userId);
  if (songsError) throw songsError;

  setStage("deleting authentication account");
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
  if (deleteUserError) throw deleteUserError;
}

export async function DELETE(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return Response.json(
      { error: "Account deletion is not configured." },
      { status: 503, headers: noStoreHeaders }
    );
  }

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!accessToken) {
    return Response.json(
      { error: "Sign in to delete your account." },
      { status: 401, headers: noStoreHeaders }
    );
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error: authError } = await authClient.auth.getUser(accessToken);

  if (authError) {
    if (authError.status === 401) {
      return Response.json(
        { error: "Your session has expired. Sign in again to continue." },
        { status: 401, headers: noStoreHeaders }
      );
    }

    console.error("Account deletion authentication check failed.");
    return Response.json(
      { error: "Could not verify your session. Please try again." },
      { status: 503, headers: noStoreHeaders }
    );
  }

  if (!data.user) {
    return Response.json(
      { error: "Sign in to delete your account." },
      { status: 401, headers: noStoreHeaders }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let stage = "starting";

  try {
    await deleteAccountData(admin, data.user.id, (nextStage) => {
      stage = nextStage;
    });
  } catch (deletionError) {
    console.error(`Account deletion failed while ${stage}.`, {
      code: getErrorCode(deletionError),
    });
    return Response.json(
      {
        error:
          "Account deletion could not be completed. Your account may still be active; please try again.",
      },
      { status: 500, headers: noStoreHeaders }
    );
  }

  return Response.json(
    { deleted: true },
    { headers: noStoreHeaders }
  );
}
