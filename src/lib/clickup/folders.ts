import { clickup } from "./client";
import type { ClickUpFoldersResponse } from "@/types/clickup";

export async function getFolders(spaceId: string) {
  const data = await clickup<ClickUpFoldersResponse>(
    `/space/${spaceId}/folder?archived=false`,
  );
  return data.folders;
}
