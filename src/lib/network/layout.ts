import type { NetworkNode, NetworkViewMode } from "@/types/network";

const INNER_RADIUS = 220;
const OUTER_RADIUS = 420;

export function layoutNetworkNodes(
  nodes: NetworkNode[],
  viewMode: NetworkViewMode,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const persons = nodes
    .filter((n) => n.type === "person")
    .sort((a, b) => a.id.localeCompare(b.id));
  const projects = nodes
    .filter((n) => n.type === "project")
    .sort((a, b) => a.id.localeCompare(b.id));

  const inner = viewMode === "people" ? persons : projects;
  const outer = viewMode === "people" ? projects : persons;

  placeRing(inner, INNER_RADIUS, positions);
  placeRing(outer, OUTER_RADIUS, positions);

  return positions;
}

function placeRing(
  nodes: NetworkNode[],
  radius: number,
  positions: Map<string, { x: number; y: number }>,
) {
  if (nodes.length === 0) return;
  const step = (2 * Math.PI) / nodes.length;
  nodes.forEach((node, i) => {
    const angle = step * i - Math.PI / 2;
    positions.set(node.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  });
}
