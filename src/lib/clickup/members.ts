import { clickup, ClickUpError } from "./client";
import type { ClickUpTeamsResponse } from "@/types/clickup";

/** Workspace members are included on GET /team — there is no separate /team/{id}/member list endpoint. */
export async function getMembers(teamId: string) {
  const data = await clickup<ClickUpTeamsResponse>("/team");
  const team = data.teams.find((t) => t.id === teamId);
  if (!team) {
    throw new ClickUpError("Workspace not found", 404);
  }
  return team.members ?? [];
}
