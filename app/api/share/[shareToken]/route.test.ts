import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mocks.from,
    rpc: mocks.rpc,
  })),
}));

import { GET } from "./route";

const shareToken = "18dca3e6-fd24-4b56-b6fd-0892481272c1";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/share/[shareToken]", () => {
  it("returns public song details and username without profile or auth data", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          display_name: "Road song",
          file_path: "uploads/user/song.mp3",
          user_id: "owner-id",
        },
        error: null,
      }),
    };
    mocks.from.mockReturnValue(query);
    mocks.rpc.mockResolvedValue({
      data: [{ user_id: "owner-id", username: "road_user" }],
      error: null,
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ shareToken }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      display_name: "Road song",
      file_path: "uploads/user/song.mp3",
      uploader_username: "road_user",
    });
    expect(query.select).toHaveBeenCalledWith(
      "display_name, file_path, user_id"
    );
    expect(mocks.rpc).toHaveBeenCalledWith("get_public_profiles", {
      p_user_ids: ["owner-id"],
    });
  });

  it("rejects malformed tokens without querying shared records", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ shareToken: "not-a-token" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
