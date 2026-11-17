import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params;

  if (!uuidPattern.test(shareToken)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("songs_meta")
    .select("display_name, file_path")
    .eq("share_token", shareToken)
    .maybeSingle();

  if (error) {
    console.error("Share lookup failed:", error.message);
    return Response.json({ error: "Unable to load share" }, { status: 500 });
  }

  if (!data) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(
    { display_name: data.display_name, file_path: data.file_path },
    { headers: { "Cache-Control": "no-store" } }
  );
}