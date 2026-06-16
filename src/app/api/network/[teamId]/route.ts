import { clickupErrorResponse } from "@/lib/clickup/client";
import { buildNetworkGraph } from "@/lib/network/buildGraph";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await params;
    const graph = await buildNetworkGraph(teamId);
    return Response.json(graph);
  } catch (error) {
    return clickupErrorResponse(error);
  }
}
