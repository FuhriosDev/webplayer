import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storageFrom: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("./supabaseClient", () => ({
  supabase: {
    storage: { from: mocks.storageFrom },
  },
}));

import { fetchSharedSongs } from "./sharedSongs";

describe("fetchSharedSongs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.storageFrom.mockReturnValue({
      getPublicUrl: (filePath: string) => ({
        data: { publicUrl: `https://storage.example/${filePath}` },
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads many shared songs in one request and exposes creator usernames", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        songs: [
          {
            share_token: "song-token-1",
            display_name: "Track one",
            file_path: "uploads/owner/one.mp3",
            uploader_username: "music_fan",
          },
          {
            share_token: "song-token-2",
            display_name: "Track two",
            file_path: "uploads/owner/two.mp3",
            uploader_username: "music_fan",
          },
        ],
      }),
    });

    const songs = await fetchSharedSongs(["song-token-1", "song-token-2"]);

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/share/batch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          shareTokens: ["song-token-1", "song-token-2"],
        }),
      })
    );
    expect(songs.get("song-token-1")).toEqual({
      name: "Track one",
      url: "https://storage.example/uploads/owner/one.mp3",
      filePath: "uploads/owner/one.mp3",
      shareToken: "song-token-1",
      artist: "music_fan",
    });
  });
});
