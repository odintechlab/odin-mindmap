import { clickup } from "./client";
import type { ClickUpSpacesResponse } from "@/types/clickup";

export async function getSpaces(teamId: string) {
  const data = await clickup<ClickUpSpacesResponse>(
    `/team/${teamId}/space?archived=false`,
  );
  return data.spaces;
}
