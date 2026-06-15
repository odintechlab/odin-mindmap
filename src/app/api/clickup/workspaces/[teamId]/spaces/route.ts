import { getSpaces } from "@/lib/clickup/spaces";
import { spaceToNode } from "@/lib/clickup/transform";
import { clickupErrorResponse } from "@/lib/clickup/client";
import { makeNodeId } from "@/types/mindmap";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await params;
    const spaces = await getSpaces(teamId);
    const parentId = makeNodeId("workspace", teamId);
    const nodes = spaces.map((s) => spaceToNode(s, parentId));
    return Response.json({ nodes });
  } catch (error) {
    return clickupErrorResponse(error);
  }
}
