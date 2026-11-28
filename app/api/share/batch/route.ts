import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStoreHeaders = { "Cache-Control": "no-store" };
type PublicProfile = { user_id: string; username: string };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Provide a list of song share tokens." },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const shareTokensInput =
    typeof body === "object" && body !== null && "shareTokens" in body
      ? body.shareTokens
      : null;
  if (
    !Array.isArray(shareTokensInput) ||
    shareTokensInput.length > 500 ||
    shareTokensInput.some(
      (token) => typeof token !== "string" || !uuidPattern.test(token)
    )
  ) {
    return Response.json(
      { error: "Song share tokens must be a list of up to 500 valid tokens." },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const shareTokens = [
    ...new Set(
      shareTokensInput.filter(
        (token): token is string =>
          typeof token === "string" && uuidPattern.test(token)
      )
    ),
  ];
  if (shareTokens.length === 0) {
    return Response.json({ songs: [] }, { headers: noStoreHeaders });
  }

  const { data: songs, error: songsError } = await supabaseAdmin
    .from("songs_meta")
    .select("share_token, display_name, file_path, user_id")
    .in("share_token", shareTokens);

  if (songsError) {
    console.error("Batch share lookup failed:", songsError.message);
    return Response.json(
      { error: "Unable to load shared songs." },
      { status: 500, headers: noStoreHeaders }
    );
  }

  const userIds = [...new Set((songs ?? []).map((song) => song.user_id))];
  const { data: profiles, error: profilesError } = userIds.length
    ? await supabaseAdmin.rpc("get_public_profiles", {
        p_user_ids: userIds,
      })
    : { data: [], error: null };

  if (profilesError) {
    console.error("Batch share profile lookup failed:", profilesError.message);
    return Response.json(
      { error: "Unable to load shared songs." },
      { status: 500, headers: noStoreHeaders }
    );
  }

  const usernames = new Map(
    ((profiles ?? []) as PublicProfile[]).map((profile) => [
      profile.user_id,
      profile.username,
    ])
  );
  return Response.json(
    {
      songs: (songs ?? []).map((song) => ({
        share_token: song.share_token,
        display_name: song.display_name,
        file_path: song.file_path,
        uploader_username: usernames.get(song.user_id) ?? "Unknown user",
      })),
    },
    { headers: noStoreHeaders }
  );
}
