import type { ClickUpMemberUser } from "@/types/clickup";

/**
 * Static denylist of ClickUp users who left / should not appear in Odin.
 * Filtered in getMembers so dashboard, network, performance, and mindmap all exclude them.
 */
export const HIDDEN_CLICKUP_USER_IDS: ReadonlySet<number> = new Set([
  101619954, // Mirgalim Aspirant
  312786202, // Tsegts Temuujin
]);

export function isHiddenClickUpUser(userId: number): boolean {
  return HIDDEN_CLICKUP_USER_IDS.has(userId);
}

/** Members with no display name render as "User 123…" and look broken in the UI. */
export function hasClickUpDisplayName(
  user: Pick<ClickUpMemberUser, "username">,
): boolean {
  return Boolean(user.username?.trim());
}

/** True when this member should be omitted from Odin people views. */
export function shouldOmitClickUpMember(
  user: Pick<ClickUpMemberUser, "id" | "username">,
): boolean {
  return isHiddenClickUpUser(user.id) || !hasClickUpDisplayName(user);
}
