import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

import { POST } from "./route";

const userId = "18dca3e6-fd24-4b56-b6fd-0892481272c1";
const accessToken = "valid-access-token";

function makeRequest(username: unknown, includeAuthorization = true) {
  return new Request("http://localhost/api/profile/username", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(includeAuthorization
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
    },
    body: JSON.stringify({ username }),
  });
}

function setupProfileUpdate(result: {
  data: { username: string } | null;
  error: { code: string; message?: string } | null;
}) {
  const query = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue(query),
  };
  mocks.createClient.mockReturnValue(client);
  return { client, query };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
});

describe("POST /api/profile/username", () => {
  it("validates usernames on the server before writing", async () => {
    const response = await POST(makeRequest("not valid"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        "Use letters, numbers, dots, underscores, or hyphens; start with a letter or number.",
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated updates", async () => {
    const response = await POST(makeRequest("valid_name", false));

    expect(response.status).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("returns a clear duplicate-username error", async () => {
    const { query } = setupProfileUpdate({
      data: null,
      error: { code: "23505", message: "duplicate key" },
    });

    const response = await POST(makeRequest("taken_name"));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "That username is already taken. Choose another one.",
    });
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
  });

  it("updates only the authenticated user's username", async () => {
    const { client, query } = setupProfileUpdate({
      data: { username: "new_name" },
      error: null,
    });

    const response = await POST(makeRequest("new_name"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ username: "new_name" });
    expect(client.auth.getUser).toHaveBeenCalledWith(accessToken);
    expect(query.update).toHaveBeenCalledWith({ username: "new_name" });
    expect(query.eq).toHaveBeenCalledWith("user_id", userId);
  });
});
