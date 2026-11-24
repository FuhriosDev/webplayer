import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./errorMessage";

describe("getErrorMessage", () => {
  it("uses the message from structured Supabase errors", () => {
    expect(
      getErrorMessage(
        { code: "PGRST202", message: "RPC function was not found" },
        "Could not remove this song."
      )
    ).toBe("RPC function was not found");
  });

  it("uses the fallback when the error has no usable message", () => {
    expect(getErrorMessage({ code: "PGRST202" }, "Could not remove this song."))
      .toBe("Could not remove this song.");
  });
});
