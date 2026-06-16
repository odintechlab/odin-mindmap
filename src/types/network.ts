export type NetworkNodeType = "person" | "project";
export type NetworkEdgeKind = "collab" | "membership";

export interface NetworkNodeMeta {
  profilePicture?: string | null;
  taskCount?: number;
}

export interface NetworkNode {
  id: string;
  type: NetworkNodeType;
  label: string;
  meta?: NetworkNodeMeta;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  kind: NetworkEdgeKind;
}

export interface NetworkGraph {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export type NetworkViewMode = "people" | "projects";
