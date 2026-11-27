import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

import { DELETE } from "./route";

const userId = "user-1";
const accessToken = "valid-access-token";

function makeRequest(includeAuthorization = true) {
  return new Request("http://localhost/api/account", {
    method: "DELETE",
    headers: includeAuthorization
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined,
  });
}

function setupClients(storageError: Error | null = null) {
  const authClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  };
  const from = vi.fn((table: string) => {
    let deleting = false;
    const query = {
      select: vi.fn(),
      delete: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
      in: vi.fn(),
    };
    query.select.mockImplementation(() => {
      deleting = false;
      return query;
    });
    query.delete.mockImplementation(() => {
      deleting = true;
      return query;
    });
    query.eq.mockImplementation(() =>
      deleting ? Promise.resolve({ error: null }) : query
    );
    query.order.mockReturnValue(query);
    query.range.mockResolvedValue({
      data:
        table === "songs_meta"
          ? [{ file_path: `uploads/${userId}/song.mp3`, share_token: "song-token" }]
          : table === "playlists"
            ? [{ id: "playlist-1" }]
            : [],
      error: null,
    });
    query.in.mockResolvedValue({ error: null });
    return query;
  });

  const storage = {
    list: vi.fn().mockResolvedValue({ data: [], error: null }),
    remove: vi.fn().mockResolvedValue({ error: storageError }),
  };
  const adminClient = {
    from,
    storage: { from: vi.fn(() => storage) },
    auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) } },
  };

  mocks.createClient
    .mockReturnValueOnce(authClient)
    .mockReturnValueOnce(adminClient);

  return { authClient, adminClient, storage };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("DELETE /api/account", () => {
  it("rejects requests without a bearer token before creating Supabase clients", async () => {
    const response = await DELETE(makeRequest(false));

    expect(response.status).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("removes account content and storage before deleting the auth user", async () => {
    const { authClient, adminClient, storage } = setupClients();

    const response = await DELETE(makeRequest());

    expect(response.status).toBe(200);
    expect(authClient.auth.getUser).toHaveBeenCalledWith(accessToken);
    expect(storage.remove).toHaveBeenCalledWith([
      `uploads/${userId}/song.mp3`,
    ]);
    expect(adminClient.auth.admin.deleteUser).toHaveBeenCalledWith(userId);
    expect(adminClient.from).toHaveBeenCalledWith("playlist_items");
    expect(adminClient.from).toHaveBeenCalledWith("saved_songs");
    expect(adminClient.from).toHaveBeenCalledWith("saved_playlists");
    expect(adminClient.from).toHaveBeenCalledWith("playlists");
    expect(adminClient.from).toHaveBeenCalledWith("songs_meta");
  });

  it("does not delete the auth user if audio removal fails", async () => {
    const { adminClient } = setupClients(new Error("Storage unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await DELETE(makeRequest());

    expect(response.status).toBe(500);
    expect(adminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Account deletion failed while removing uploaded audio.",
      { code: undefined }
    );
    consoleError.mockRestore();
  });
});
