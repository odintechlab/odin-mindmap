"use client";

import { memo } from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import { useNetworkInteraction } from "../NetworkInteractionContext";
import type { NetworkEdgeKind } from "@/types/network";

export interface NetworkEdgeData {
  weight: number;
  kind: NetworkEdgeKind;
  maxWeight: number;
}

const MAX_EDGE_STROKE = 5;

function edgeStrokeWidth(weight: number, maxWeight: number) {
  if (maxWeight <= 1) return 1.5;
  return 1 + (Math.min(weight, maxWeight) / maxWeight) * (MAX_EDGE_STROKE - 1);
}

function NetworkEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps) {
  const edge = data as unknown as NetworkEdgeData;
  const { neighborIds } = useNetworkInteraction();
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY });

  const inHighlight =
    neighborIds == null ||
    (neighborIds.has(source) && neighborIds.has(target));

  const isCollab = edge.kind === "collab";
  const baseOpacity = isCollab ? 0.7 : 0.45;
  const opacity = neighborIds == null ? baseOpacity : inHighlight ? 0.85 : 0.08;
  const stroke = isCollab ? "var(--accent)" : "var(--border-strong)";
  const animated = isCollab && neighborIds != null && inHighlight;

  return (
    <BaseEdge
      id={id}
      path={path}
      className={animated ? "network-edge-animated" : undefined}
      style={{
        stroke,
        strokeWidth: edgeStrokeWidth(edge.weight, edge.maxWeight),
        opacity,
        transition: "opacity 150ms ease",
      }}
    />
  );
}

export const NetworkEdge = memo(NetworkEdgeComponent);
