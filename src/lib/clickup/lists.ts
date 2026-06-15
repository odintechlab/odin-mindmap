import { clickup } from "./client";
import type { ClickUpListsResponse, ClickUpListResponse } from "@/types/clickup";

export async function getListsInFolder(folderId: string) {
  const data = await clickup<ClickUpListsResponse>(
    `/folder/${folderId}/list?archived=false`,
  );
  return data.lists;
}

export async function getFolderlessLists(spaceId: string) {
  const data = await clickup<ClickUpListsResponse>(
    `/space/${spaceId}/list?archived=false`,
  );
  return data.lists;
}

export async function getList(listId: string) {
  return clickup<ClickUpListResponse>(`/list/${listId}`);
}
