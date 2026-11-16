import { describe, expect, it } from "vitest";
import {
  hasClickUpDisplayName,
  isHiddenClickUpUser,
  shouldOmitClickUpMember,
} from "./hiddenPeople";

describe("hasClickUpDisplayName", () => {
  it("accepts a non-empty username", () => {
    expect(hasClickUpDisplayName({ username: "Anujin" })).toBe(true);
  });

  it("rejects null, empty, and whitespace usernames", () => {
    expect(hasClickUpDisplayName({ username: null })).toBe(false);
    expect(hasClickUpDisplayName({ username: "" })).toBe(false);
    expect(hasClickUpDisplayName({ username: "   " })).toBe(false);
  });
});

describe("shouldOmitClickUpMember", () => {
  it("omits denylisted users even when named", () => {
    expect(
      shouldOmitClickUpMember({ id: 101619954, username: "Mirgalim Aspirant" }),
    ).toBe(true);
    expect(isHiddenClickUpUser(101619954)).toBe(true);
  });

  it("omits unnamed users that would render as User <id>", () => {
    expect(shouldOmitClickUpMember({ id: 119413830, username: null })).toBe(
      true,
    );
  });

  it("keeps normal members", () => {
    expect(shouldOmitClickUpMember({ id: 1, username: "Gerel" })).toBe(false);
  });
});
