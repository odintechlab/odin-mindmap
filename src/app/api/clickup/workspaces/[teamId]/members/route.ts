import { getMembers } from "@/lib/clickup/members";
import { memberToNode } from "@/lib/clickup/transform";
import { clickupErrorResponse } from "@/lib/clickup/client";
import { makeNodeId } from "@/types/mindmap";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await params;
    const parentId = makeNodeId("people", teamId);
    const members = await getMembers(teamId);
    const nodes = members.map((m) => memberToNode(m, parentId, teamId));
    return Response.json({ nodes });
  } catch (error) {
    return clickupErrorResponse(error);
  }
}
