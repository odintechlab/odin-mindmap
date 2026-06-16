"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Avatar } from "@/components/ui/Avatar";
import { useNetworkInteraction } from "../NetworkInteractionContext";

export interface PersonNodeData {
  label: string;
  profilePicture?: string | null;
}

function PersonNodeComponent({ id, data }: NodeProps) {
  const node = data as unknown as PersonNodeData;
  const { activeId, neighborIds, focusedId } = useNetworkInteraction();

  const inHighlight = neighborIds?.has(id) ?? false;
  const dimmed = neighborIds != null && !inHighlight;
  const focused = focusedId === id;
  const highlighted =
    activeId === id || (neighborIds != null && inHighlight && activeId != null);

  return (
    <div
      className={`flex flex-col items-center gap-1.5 transition-opacity duration-150 ${
        focused ? "scale-105" : ""
      }`}
      style={{ opacity: dimmed ? 0.25 : 1 }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-1 !h-1" />
      <div
        className={`rounded-full p-0.5 transition-shadow duration-150 ${
          highlighted || focused
            ? "ring-2 ring-indigo-500 shadow-[0_0_12px_var(--accent-glow)]"
            : ""
        }`}
      >
        <Avatar name={node.label} src={node.profilePicture} size={36} />
      </div>
      <span
        className={`max-w-[88px] truncate text-center text-[10px] font-semibold leading-tight ${
          highlighted || focused
            ? "text-indigo-600 dark:text-indigo-300"
            : "text-zinc-700 dark:text-zinc-300"
        }`}
      >
        {node.label}
      </span>
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-1 !h-1" />
    </div>
  );
}

export const PersonNode = memo(PersonNodeComponent);
