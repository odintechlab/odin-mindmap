export interface ScreenBar<T> {
  item: T;
  x1: number;
  x2: number;
}

export interface ClusterNode<T> {
  type: "cluster";
  x1: number;
  x2: number;
  members: T[];
}

export interface SingleNode<T> {
  type: "single";
  x1: number;
  x2: number;
  item: T;
}

export type VisibleNode<T> = SingleNode<T> | ClusterNode<T>;

/**
 * Sweeps screen-space bars within a single lane (order not required —
 * sorted internally) and merges consecutive bars into a cluster whenever
 * the gap between one bar's right edge and the next's left edge is under
 * clusterGapPx. minBarPx enforces a minimum rendered width per bar (so a
 * bar never becomes literally imperceptible before it's eligible to merge
 * with a neighbor). Keeps zoomed-out views legible instead of rendering
 * illegible slivers.
 */
export function clusterVisibleBars<T>(
  bars: ScreenBar<T>[],
  minBarPx: number,
  clusterGapPx: number,
): VisibleNode<T>[] {
  const sorted = [...bars].sort((a, b) => a.x1 - b.x1);
  const nodes: VisibleNode<T>[] = [];

  for (const bar of sorted) {
    const x2 = Math.max(bar.x2, bar.x1 + minBarPx);
    const last = nodes[nodes.length - 1];

    if (last && bar.x1 - last.x2 < clusterGapPx) {
      if (last.type === "cluster") {
        last.x2 = Math.max(last.x2, x2);
        last.members.push(bar.item);
      } else {
        nodes[nodes.length - 1] = {
          type: "cluster",
          x1: last.x1,
          x2: Math.max(last.x2, x2),
          members: [last.item, bar.item],
        };
      }
    } else {
      nodes.push({ type: "single", x1: bar.x1, x2, item: bar.item });
    }
  }

  return nodes;
}
