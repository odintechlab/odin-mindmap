import { getWorkspaces } from "@/lib/clickup/workspaces";
import { workspaceToNode } from "@/lib/clickup/transform";
import { clickupErrorResponse } from "@/lib/clickup/client";

export async function GET() {
  try {
    const teams = await getWorkspaces();
    const nodes = teams.map(workspaceToNode);
    return Response.json({ nodes });
  } catch (error) {
    return clickupErrorResponse(error);
  }
}
