import { createClient } from "@supabase/supabase-js";
import { getUsernameValidationError } from "../../../../lib/username";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return Response.json(
      { error: "Username settings are not configured." },
      { status: 503, headers: noStoreHeaders }
    );
  }

  const accessToken = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!accessToken) {
    return Response.json(
      { error: "Sign in to change your username." },
      { status: 401, headers: noStoreHeaders }
    );
  }

  let body: { username?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Enter a valid username." },
      { status: 400, headers: noStoreHeaders }
    );
  }

  if (typeof body.username !== "string") {
    return Response.json(
      { error: "Enter a valid username." },
      { status: 400, headers: noStoreHeaders }
    );
  }
  const username = body.username.trim();
  const validationError = getUsernameValidationError(username);
  if (validationError) {
    return Response.json(
      { error: validationError },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: userData, error: authError } =
    await supabase.auth.getUser(accessToken);

  if (authError || !userData.user) {
    return Response.json(
      { error: "Your session has expired. Sign in again to continue." },
      { status: 401, headers: noStoreHeaders }
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("user_id", userData.user.id)
    .select("username")
    .maybeSingle();

  if (error?.code === "23505") {
    return Response.json(
      { error: "That username is already taken. Choose another one." },
      { status: 409, headers: noStoreHeaders }
    );
  }
  if (error?.code === "23514") {
    return Response.json(
      { error: getUsernameValidationError(username) ?? "Enter a valid username." },
      { status: 400, headers: noStoreHeaders }
    );
  }
  if (error) {
    console.error("Username update failed:", error.message);
    return Response.json(
      { error: "Could not update your username. Please try again." },
      { status: 500, headers: noStoreHeaders }
    );
  }
  if (!data) {
    return Response.json(
      { error: "Your profile is not available. Please contact support." },
      { status: 404, headers: noStoreHeaders }
    );
  }

  return Response.json({ username: data.username }, { headers: noStoreHeaders });
}
