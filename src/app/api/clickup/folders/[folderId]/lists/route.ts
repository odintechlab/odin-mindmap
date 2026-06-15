import { getListsInFolder } from "@/lib/clickup/lists";
import { listToNode } from "@/lib/clickup/transform";
import { clickupErrorResponse } from "@/lib/clickup/client";
import { makeNodeId } from "@/types/mindmap";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ folderId: string }> },
) {
  try {
    const { folderId } = await params;
    const parentId = makeNodeId("folder", folderId);
    const lists = await getListsInFolder(folderId);
    const nodes = lists.map((l) => listToNode(l, parentId));
    return Response.json({ nodes });
  } catch (error) {
    return clickupErrorResponse(error);
  }
}
