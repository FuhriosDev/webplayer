import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  storageFrom: vi.fn(),
}));

vi.mock("./supabaseClient", () => ({
  supabase: {
    from: mocks.from,
    storage: { from: mocks.storageFrom },
  },
}));

import {
  deleteSong,
  fetchSavedSongTokens,
  renameSong,
  saveSong,
  unsaveSong,
} from "./songActions";

describe("song mutation errors", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("propagates song rename errors", async () => {
    const updateError = new Error("Rename failed");
    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: updateError }),
    };
    mocks.from.mockReturnValueOnce(query);

    await expect(renameSong("song.mp3", "New name")).rejects.toBe(updateError);
  });

  it("stops song deletion when storage removal fails", async () => {
    const storageError = new Error("Storage deletion failed");
    const remove = vi.fn().mockResolvedValue({ error: storageError });
    mocks.storageFrom.mockReturnValueOnce({ remove });

    await expect(deleteSong("song.mp3")).rejects.toBe(storageError);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("propagates metadata deletion errors after storage removal", async () => {
    const metadataError = new Error("Metadata deletion failed");
    const remove = vi.fn().mockResolvedValue({ error: null });
    const query = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: metadataError }),
    };
    mocks.storageFrom.mockReturnValueOnce({ remove });
    mocks.from.mockReturnValueOnce(query);

    await expect(deleteSong("song.mp3")).rejects.toBe(metadataError);
  });

  it("treats a no-row saved-song removal as an error", async () => {
    const query = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mocks.from.mockReturnValueOnce(query);

    await expect(unsaveSong("user-1", "share-token")).rejects.toThrow(
      "No saved song was removed."
    );
  });

  it("saves a song for the current user", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValueOnce({ insert });

    await saveSong("user-1", "share-token");

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      share_token: "share-token",
    });
  });

  it("treats an already-saved song as saved", async () => {
    const insert = vi.fn().mockResolvedValue({
      error: { code: "23505", message: "duplicate key" },
    });
    mocks.from.mockReturnValueOnce({ insert });

    await expect(saveSong("user-1", "share-token")).resolves.toBeUndefined();
  });

  it("loads saved status for playlist songs", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ share_token: "saved-token" }],
        error: null,
      }),
    };
    mocks.from.mockReturnValueOnce(query);

    await expect(
      fetchSavedSongTokens("user-1", ["saved-token", "unsaved-token"])
    ).resolves.toEqual(new Set(["saved-token"]));
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.in).toHaveBeenCalledWith("share_token", [
      "saved-token",
      "unsaved-token",
    ]);
  });
});
