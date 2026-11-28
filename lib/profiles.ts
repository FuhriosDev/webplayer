import { supabase } from "./supabaseClient";

type PublicProfile = { user_id: string; username: string };

export async function fetchPublicUsernames(
  userIds: string[]
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase.rpc("get_public_profiles", {
    p_user_ids: uniqueIds,
  });
  if (error) throw error;

  return new Map(
    ((data ?? []) as PublicProfile[]).map((profile) => [
      profile.user_id,
      profile.username,
    ])
  );
}
