import { getFolders } from "@/lib/clickup/folders";
import { getFolderlessLists } from "@/lib/clickup/lists";
import { folderToNode, listToNode } from "@/lib/clickup/transform";
import { clickupErrorResponse } from "@/lib/clickup/client";
import { makeNodeId } from "@/types/mindmap";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  try {
    const { spaceId } = await params;
    const parentId = makeNodeId("space", spaceId);

    const [folders, folderlessLists] = await Promise.all([
      getFolders(spaceId),
      getFolderlessLists(spaceId),
    ]);

    const nodes = [
      ...folders.map((f) => folderToNode(f, parentId)),
      ...folderlessLists.map((l) => listToNode(l, parentId)),
    ];

    return Response.json({ nodes });
  } catch (error) {
    return clickupErrorResponse(error);
  }
}
