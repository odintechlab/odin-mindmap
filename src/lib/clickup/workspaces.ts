import { clickup } from "./client";
import type { ClickUpTeamsResponse } from "@/types/clickup";

export async function getWorkspaces() {
  const data = await clickup<ClickUpTeamsResponse>("/team");
  return data.teams;
}
