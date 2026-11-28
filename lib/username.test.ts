import { describe, expect, it } from "vitest";
import { getUsernameValidationError } from "./username";

describe("username validation", () => {
  it("accepts usernames with allowed characters and lengths", () => {
    expect(getUsernameValidationError("player_01")).toBeNull();
    expect(getUsernameValidationError("abc")).toBeNull();
    expect(getUsernameValidationError("a".repeat(24))).toBeNull();
  });

  it.each(["", "  ", "ab", "a".repeat(25), "-player", "not a username"])(
    "rejects invalid username %j",
    (username) => {
      expect(getUsernameValidationError(username)).not.toBeNull();
    }
  );
});
