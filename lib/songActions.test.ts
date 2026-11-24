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

import { deleteSong, renameSong, unsaveSong } from "./songActions";

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
});
