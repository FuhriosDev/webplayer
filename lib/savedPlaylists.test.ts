import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("./supabaseClient", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  },
}));

import {
  fetchPlaylist,
  fetchPlaylistSaveStatus,
  fetchPlaylists,
  savePlaylist,
  unsavePlaylist,
} from "./playlists";

describe("saved playlists", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("includes owned playlists and saved references without duplicates", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const ownedQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "owned",
            name: "Mine",
            created_at: "2026-01-03",
            share_token: null,
          },
          {
            id: "also-saved",
            name: "Mine too",
            created_at: "2026-01-02",
            share_token: "owned-token",
          },
        ],
        error: null,
      }),
    };
    const savedQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { playlist_id: "shared" },
          { playlist_id: "also-saved" },
        ],
        error: null,
      }),
    };
    const savedPlaylistQuery = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "shared",
            name: "Shared list",
            created_at: "2026-01-01",
            share_token: "shared-token",
          },
        ],
        error: null,
      }),
    };
    mocks.from
      .mockReturnValueOnce(ownedQuery)
      .mockReturnValueOnce(savedQuery)
      .mockReturnValueOnce(savedPlaylistQuery);

    await expect(fetchPlaylists()).resolves.toEqual([
      {
        id: "owned",
        name: "Mine",
        created_at: "2026-01-03",
        shareToken: null,
      },
      {
        id: "also-saved",
        name: "Mine too",
        created_at: "2026-01-02",
        shareToken: "owned-token",
      },
      {
        id: "shared",
        name: "Shared list",
        created_at: "2026-01-01",
        shareToken: "shared-token",
        isSaved: true,
      },
    ]);
    expect(savedPlaylistQuery.in).toHaveBeenCalledWith("id", ["shared"]);
  });

  it("reports playlist owner and saved status", async () => {
    const ownerQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };
    const savedQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { playlist_id: "playlist-1" },
        error: null,
      }),
    };
    mocks.from
      .mockReturnValueOnce(ownerQuery)
      .mockReturnValueOnce(savedQuery);

    await expect(
      fetchPlaylistSaveStatus("playlist-1", "user-1")
    ).resolves.toEqual({ isOwner: false, isSaved: true });
  });

  it("falls back to the playlist ID for owner navigation", async () => {
    const sharedLookup = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const ownerLookup = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "playlist-id",
          name: "My playlist",
          created_at: "2026-01-01",
          share_token: null,
        },
        error: null,
      }),
    };
    mocks.from
      .mockReturnValueOnce(sharedLookup)
      .mockReturnValueOnce(ownerLookup);

    await expect(fetchPlaylist("playlist-id")).resolves.toEqual({
      id: "playlist-id",
      name: "My playlist",
      created_at: "2026-01-01",
      shareToken: null,
    });
    expect(sharedLookup.eq).toHaveBeenCalledWith(
      "share_token",
      "playlist-id"
    );
    expect(ownerLookup.eq).toHaveBeenCalledWith("id", "playlist-id");
  });

  it("saves a shared playlist reference", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValueOnce({ insert });

    await savePlaylist("playlist-1", "user-1");

    expect(insert).toHaveBeenCalledWith({
      playlist_id: "playlist-1",
      user_id: "user-1",
    });
  });

  it("reports an already-saved playlist as a friendly duplicate", async () => {
    const insert = vi.fn().mockResolvedValue({
      error: { code: "23505", message: "duplicate key" },
    });
    mocks.from.mockReturnValueOnce({ insert });

    await expect(savePlaylist("playlist-1", "user-1")).rejects.toThrow(
      "This playlist is already in your library."
    );
  });

  it("unsaves a playlist reference", async () => {
    const query = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [{ playlist_id: "playlist-1" }],
        error: null,
      }),
    };
    mocks.from.mockReturnValueOnce(query);

    await expect(unsavePlaylist("playlist-1", "user-1")).resolves.toBeUndefined();
    expect(query.eq).toHaveBeenNthCalledWith(1, "playlist_id", "playlist-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
  });
});
