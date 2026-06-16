import { getMembers } from "@/lib/clickup/members";
import { getTasksForAssignee } from "@/lib/clickup/tasks";
import type { NetworkEdge, NetworkGraph, NetworkNode } from "@/types/network";

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function personId(userId: string) {
  return `person:${userId}`;
}

function projectId(listId: string) {
  return `project:${listId}`;
}

function collabEdgeId(a: string, b: string) {
  const [x, y] = [a, b].sort();
  return `collab:${x}:${y}`;
}

export async function buildNetworkGraph(teamId: string): Promise<NetworkGraph> {
  const members = await getMembers(teamId);
  const personNodes = new Map<string, NetworkNode>();
  const projectNodes = new Map<string, NetworkNode>();
  const membershipWeights = new Map<string, number>();
  const collabWeights = new Map<string, number>();
  const projectTaskIds = new Map<string, Set<string>>();
  const personTaskCounts = new Map<string, number>();

  for (const member of members) {
    const userId = String(member.user.id);
    personNodes.set(personId(userId), {
      id: personId(userId),
      type: "person",
      label: member.user.username,
      meta: { profilePicture: member.user.profilePicture, taskCount: 0 },
    });
  }

  const memberTasks = await mapWithConcurrency(members, 6, async (member) => {
    const userId = String(member.user.id);
    const tasks = await getTasksForAssignee(teamId, userId);
    return { member, userId, tasks };
  });

  for (const { userId, tasks } of memberTasks) {
    personTaskCounts.set(userId, tasks.length);

    for (const task of tasks) {
      const listId = task.list?.id;
      if (listId) {
        const pid = projectId(listId);
        if (!projectNodes.has(pid)) {
          projectNodes.set(pid, {
            id: pid,
            type: "project",
            label: task.list!.name,
            meta: { taskCount: 0 },
          });
        }

        const mKey = `${userId}:${listId}`;
        membershipWeights.set(mKey, (membershipWeights.get(mKey) ?? 0) + 1);

        let ids = projectTaskIds.get(listId);
        if (!ids) {
          ids = new Set();
          projectTaskIds.set(listId, ids);
        }
        ids.add(task.id);
      }

      const assigneeIds = task.assignees.map((a) => String(a.id));
      if (assigneeIds.length > 1) {
        for (let i = 0; i < assigneeIds.length; i++) {
          for (let j = i + 1; j < assigneeIds.length; j++) {
            const [a, b] = [assigneeIds[i], assigneeIds[j]].sort();
            const key = `${a}:${b}`;
            collabWeights.set(key, (collabWeights.get(key) ?? 0) + 1);
          }
        }
      }
    }
  }

  for (const [userId, count] of personTaskCounts) {
    const node = personNodes.get(personId(userId));
    if (node) {
      node.meta = { ...node.meta, taskCount: count };
    }
  }

  for (const [listId, ids] of projectTaskIds) {
    const node = projectNodes.get(projectId(listId));
    if (node) {
      node.meta = { ...node.meta, taskCount: ids.size };
    }
  }

  const edges: NetworkEdge[] = [];

  for (const [key, weight] of membershipWeights) {
    const [userId, listId] = key.split(":");
    edges.push({
      id: `membership:${userId}:${listId}`,
      source: personId(userId),
      target: projectId(listId),
      weight,
      kind: "membership",
    });
  }

  for (const [key, weight] of collabWeights) {
    const [a, b] = key.split(":");
    edges.push({
      id: collabEdgeId(a, b),
      source: personId(a),
      target: personId(b),
      weight,
      kind: "collab",
    });
  }

  return {
    nodes: [...personNodes.values(), ...projectNodes.values()],
    edges,
  };
}
