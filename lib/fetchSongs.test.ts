import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  storageFrom: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("./supabaseClient", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
    storage: { from: mocks.storageFrom },
  },
}));

import { fetchSongs } from "./fetchSongs";
import {
  addSongToPlaylist,
  fetchPlaylistSongs,
  fetchPlaylistsForSong,
  removeSongFromPlaylist,
} from "./playlists";

function ownedSongsQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockResolvedValue(result);
  return query;
}

function savedSongsQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockResolvedValue(result);
  return query;
}

describe("song data loading errors", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    vi.stubGlobal("fetch", mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects when there is no authenticated user", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(fetchSongs()).rejects.toThrow("Sign in to load your songs.");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("propagates an owned-song query error", async () => {
    const queryError = new Error("Owned songs query failed");
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.from.mockReturnValueOnce(
      ownedSongsQuery({ data: null, error: queryError })
    );

    await expect(fetchSongs()).rejects.toBe(queryError);
  });

  it("propagates a saved-song query error instead of returning a partial library", async () => {
    const queryError = new Error("Saved songs query failed");
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.from
      .mockReturnValueOnce(ownedSongsQuery({ data: [], error: null }))
      .mockReturnValueOnce(
        savedSongsQuery({ data: null, error: queryError })
      );

    await expect(fetchSongs()).rejects.toBe(queryError);
  });

  it("rejects when a saved song cannot be loaded", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.from
      .mockReturnValueOnce(ownedSongsQuery({ data: [], error: null }))
      .mockReturnValueOnce(
        savedSongsQuery({
          data: [{ share_token: "missing-song" }],
          error: null,
        })
      );
    mocks.fetch.mockResolvedValue({ ok: false, status: 404 });

    await expect(fetchSongs()).rejects.toThrow(
      "Could not load shared songs (404)."
    );
  });

  it("rejects when a playlist song cannot be loaded", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockResolvedValue({
      data: [{ share_token: "missing-song", position: 0 }],
      error: null,
    });
    mocks.from.mockReturnValueOnce(query);
    mocks.fetch.mockResolvedValue({ ok: false, status: 404 });

    await expect(fetchPlaylistSongs("playlist-1")).rejects.toThrow(
      "Could not load shared songs (404)."
    );
  });

  it("calls the playlist removal RPC with its declared parameters", async () => {
    mocks.rpc.mockResolvedValue({ error: null });

    await removeSongFromPlaylist("playlist-1", "share-token");

    expect(mocks.rpc).toHaveBeenCalledWith(
      "remove_playlist_song_and_compact",
      {
        p_playlist_id: "playlist-1",
        p_share_token: "share-token",
      }
    );
  });

  it("reports a duplicate playlist song in user-friendly terms", async () => {
    const positionQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { position: 2 },
        error: null,
      }),
    };
    const duplicateError = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "playlist_items_pkey"',
    };
    const insertQuery = {
      insert: vi.fn().mockResolvedValue({ error: duplicateError }),
    };
    mocks.from
      .mockReturnValueOnce(positionQuery)
      .mockReturnValueOnce(insertQuery);

    await expect(
      addSongToPlaylist("playlist-1", "share-token")
    ).rejects.toThrow("This song is already in this playlist.");
  });

  it("reports which of the user's playlists already contain the song", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    const playlistsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "playlist-1",
            name: "Favorites",
            created_at: "2026-01-01",
            share_token: null,
            user_id: "user-1",
          },
          {
            id: "playlist-2",
            name: "Road trip",
            created_at: "2026-01-02",
            share_token: null,
            user_id: "user-2",
          },
        ],
        error: null,
      }),
    };
    const membershipQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ playlist_id: "playlist-2" }],
        error: null,
      }),
    };
    const savedPlaylistsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mocks.from
      .mockReturnValueOnce(playlistsQuery)
      .mockReturnValueOnce(savedPlaylistsQuery)
      .mockReturnValueOnce(membershipQuery);
    mocks.rpc.mockResolvedValueOnce({
      data: [
        { user_id: "user-1", username: "playlist_owner" },
        { user_id: "user-2", username: "another_owner" },
      ],
      error: null,
    });

    await expect(fetchPlaylistsForSong("share-token")).resolves.toEqual([
      {
        id: "playlist-1",
        name: "Favorites",
        created_at: "2026-01-01",
        shareToken: null,
        creatorUsername: "playlist_owner",
        containsSong: false,
      },
      {
        id: "playlist-2",
        name: "Road trip",
        created_at: "2026-01-02",
        shareToken: null,
        creatorUsername: "another_owner",
        containsSong: true,
      },
    ]);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});
