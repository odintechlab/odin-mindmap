"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Avatar } from "@/components/ui/Avatar";

export interface PersonNodeData {
  label: string;
  profilePicture?: string | null;
  dimmed?: boolean;
  highlighted?: boolean;
  focused?: boolean;
}

function PersonNodeComponent({ data }: NodeProps) {
  const node = data as unknown as PersonNodeData;
  const opacity = node.dimmed ? 0.25 : 1;

  return (
    <div
      className={`flex flex-col items-center gap-1.5 transition-opacity duration-200 ${
        node.focused ? "scale-105" : ""
      }`}
      style={{ opacity }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-1 !h-1" />
      <div
        className={`rounded-full p-0.5 transition-shadow duration-200 ${
          node.highlighted || node.focused
            ? "ring-2 ring-indigo-500 shadow-[0_0_12px_var(--accent-glow)]"
            : ""
        }`}
      >
        <Avatar name={node.label} src={node.profilePicture} size={36} />
      </div>
      <span
        className={`max-w-[88px] truncate text-center text-[10px] font-semibold leading-tight ${
          node.highlighted || node.focused
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
