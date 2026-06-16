import type { ClickUpTask, ClickUpList, ClickUpFolder, ClickUpSpace, ClickUpTeam, ClickUpMember } from "@/types/clickup";
import {
  makeNodeId,
  type MindMapNodeData,
  type NodeRecord,
} from "@/types/mindmap";

function parseCount(count: string | number | null | undefined): number | undefined {
  if (count == null) return undefined;
  const n = typeof count === "string" ? parseInt(count, 10) : count;
  return isNaN(n) ? undefined : n;
}

export function workspaceToNode(team: ClickUpTeam): NodeRecord {
  const id = makeNodeId("workspace", team.id);
  return {
    id,
    data: {
      type: "workspace",
      clickupId: team.id,
      parentId: null,
      label: team.name,
      hasChildren: true,
      childrenLoaded: false,
    },
  };
}

export function spaceToNode(space: ClickUpSpace, parentId: string): NodeRecord {
  const id = makeNodeId("space", space.id);
  return {
    id,
    data: {
      type: "space",
      clickupId: space.id,
      parentId,
      label: space.name,
      hasChildren: true,
      childrenLoaded: false,
    },
  };
}

export function folderToNode(folder: ClickUpFolder, parentId: string): NodeRecord {
  const id = makeNodeId("folder", folder.id);
  const childCount = parseCount(folder.task_count);
  return {
    id,
    data: {
      type: "folder",
      clickupId: folder.id,
      parentId,
      label: folder.name,
      hasChildren: true,
      childrenLoaded: false,
      childCount,
    },
  };
}

export function listToNode(list: ClickUpList, parentId: string): NodeRecord {
  const id = makeNodeId("list", list.id);
  const childCount = parseCount(list.task_count);
  return {
    id,
    data: {
      type: "list",
      clickupId: list.id,
      parentId,
      label: list.name,
      hasChildren: true,
      childrenLoaded: false,
      childCount,
      listId: list.id,
    },
  };
}

export function peopleToNode(workspaceId: string, parentId: string): NodeRecord {
  const id = makeNodeId("people", workspaceId);
  return {
    id,
    data: {
      type: "people",
      clickupId: workspaceId,
      parentId,
      label: "People",
      hasChildren: true,
      childrenLoaded: false,
    },
  };
}

export function memberToNode(
  member: ClickUpMember,
  parentId: string,
  workspaceId: string,
): NodeRecord {
  const user = member.user;
  const id = makeNodeId("member", String(user.id));
  return {
    id,
    data: {
      type: "member",
      clickupId: String(user.id),
      parentId,
      label: user.username || user.email || `User ${user.id}`,
      assignees: [
        { username: user.username, profilePicture: user.profilePicture },
      ],
      workspaceId,
      hasChildren: true,
      childrenLoaded: false,
    },
  };
}

export function taskToNode(
  task: ClickUpTask,
  parentId: string,
  listStatuses?: { name: string; color: string }[],
): NodeRecord {
  const type = task.parent ? "subtask" : "task";
  const id = makeNodeId(type, task.id);

  return {
    id,
    data: {
      type,
      clickupId: task.id,
      parentId: task.parent ? makeNodeId("task", task.parent) : parentId,
      label: task.name,
      status: task.status
        ? {
            name: task.status.status,
            color: task.status.color,
            type: task.status.type,
          }
        : undefined,
      priority: task.priority
        ? {
            id: task.priority.id,
            label: task.priority.priority,
            color: task.priority.color,
          }
        : undefined,
      dueDate: task.due_date ?? null,
      assignees: task.assignees?.map((a) => ({
        username: a.username,
        profilePicture: a.profilePicture,
      })),
      url: task.url,
      listId: task.list?.id,
      statuses: listStatuses,
      hasChildren: false,
      childrenLoaded: true,
    },
  };
}

export function tasksToNodes(
  tasks: ClickUpTask[],
  listParentId: string,
  listStatuses?: { name: string; color: string }[],
): NodeRecord[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));

  function parentNodeId(task: ClickUpTask): string {
    if (!task.parent) return listParentId;
    const parent = byId.get(task.parent);
    const parentType = parent?.parent ? "subtask" : "task";
    return makeNodeId(parentType, task.parent);
  }

  function nodeType(task: ClickUpTask): "task" | "subtask" {
    return task.parent ? "subtask" : "task";
  }

  const nodes: NodeRecord[] = tasks.map((task) => {
    const type = nodeType(task);
    const id = makeNodeId(type, task.id);
    const parentId = parentNodeId(task);

    const childCount = tasks.filter((t) => t.parent === task.id).length;

    return {
      id,
      data: {
        ...taskToNode(task, parentId, listStatuses).data,
        parentId,
        type,
        hasChildren: childCount > 0,
        childCount: childCount > 0 ? childCount : undefined,
        childrenLoaded: true,
      },
    };
  });

  return nodes;
}

export function applyTaskUpdate(
  data: MindMapNodeData,
  update: { name?: string; status?: string; priority?: number | null },
  updatedTask?: ClickUpTask,
): MindMapNodeData {
  const next = { ...data };

  if (update.name !== undefined) next.label = update.name;

  if (updatedTask?.status) {
    next.status = {
      name: updatedTask.status.status,
      color: updatedTask.status.color,
      type: updatedTask.status.type,
    };
  } else if (update.status !== undefined) {
    next.status = { ...next.status!, name: update.status };
  }

  if (update.priority === null) {
    next.priority = undefined;
  } else if (updatedTask?.priority) {
    next.priority = {
      id: updatedTask.priority.id,
      label: updatedTask.priority.priority,
      color: updatedTask.priority.color,
    };
  }

  return next;
}
