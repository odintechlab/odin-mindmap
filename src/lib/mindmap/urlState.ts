import type { NodeRecord, NodeType } from "@/types/mindmap";
import { parseNodeId } from "@/types/mindmap";

const BASE = "/mindmap";
const LEGACY_PARAM = "path";
const LEGACY_SEP = "|";

const PATH_TYPES = new Set<string>([
  "workspace",
  "space",
  "folder",
  "list",
  "task",
  "subtask",
  "people",
  "member",
]);

/**
 * Read deep-link node ids from a clean pathname:
 *   /mindmap/workspace/9018…/space/9018…/list/9018…
 * Also accepts the legacy `?path=workspace:…|space:…` form.
 */
export function readMindmapPath(): string[] {
  if (typeof window === "undefined") return [];

  const fromPath = pathIdsFromPathname(window.location.pathname);
  if (fromPath.length > 0) return fromPath;

  return pathIdsFromLegacyQuery(window.location.search);
}

/** Persist selection as clean path segments (no % encoding noise). */
export function writeMindmapPath(pathIds: string[]): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete(LEGACY_PARAM);

  const segments: string[] = [];
  for (const id of pathIds) {
    if (id.startsWith("loadmore:")) continue;
    const { type, clickupId } = parseNodeId(id);
    if (!PATH_TYPES.has(type) || !clickupId) continue;
    segments.push(type, clickupId);
  }

  url.pathname = segments.length > 0 ? `${BASE}/${segments.join("/")}` : BASE;

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(null, "", next);
  }
}

/** Ancestor chain from root → selected (inclusive). */
export function pathIdsFromSelection(
  selectedId: string | null,
  cache: Map<string, NodeRecord>,
): string[] {
  if (!selectedId || selectedId.startsWith("loadmore:")) return [];

  const ids: string[] = [];
  let current: string | null = selectedId;
  while (current) {
    const record = cache.get(current);
    if (!record) break;
    ids.unshift(current);
    current = record.data.parentId;
  }
  return ids;
}

/** Workspace clickup id from a deep-link path, if present. */
export function workspaceIdFromPath(pathIds: string[]): string | null {
  for (const id of pathIds) {
    const { type, clickupId } = parseNodeId(id);
    if (type === "workspace" && clickupId) return clickupId;
  }
  return null;
}

/** True when the path is a hierarchy link (not a member-scope root). */
export function isHierarchyPath(pathIds: string[]): boolean {
  if (pathIds.length === 0) return false;
  const { type } = parseNodeId(pathIds[0]!);
  return type === "workspace" || type === "space" || type === "folder" || type === "list";
}

function pathIdsFromPathname(pathname: string): string[] {
  if (pathname !== BASE && !pathname.startsWith(`${BASE}/`)) return [];

  const rest = pathname === BASE ? "" : pathname.slice(BASE.length + 1);
  const parts = rest.split("/").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return [];

  const ids: string[] = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const type = parts[i]!;
    const clickupId = parts[i + 1]!;
    if (!PATH_TYPES.has(type) || !clickupId) continue;
    ids.push(`${type as NodeType}:${clickupId}`);
  }
  return ids;
}

function pathIdsFromLegacyQuery(search: string): string[] {
  const raw = new URLSearchParams(search).get(LEGACY_PARAM);
  if (!raw?.trim()) return [];
  return raw
    .split(LEGACY_SEP)
    .map((segment) => segment.trim())
    .filter(Boolean);
}
