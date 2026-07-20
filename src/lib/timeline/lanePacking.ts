interface Interval {
  startMs: number;
  endMs: number;
}

/**
 * Greedy interval-scheduling lane assignment: sorts by start time and
 * assigns each item to the first lane whose last item already ended,
 * opening a new lane otherwise. O(n * lanes), which is fine at the scale
 * of a single workspace's tasks (dozens to low hundreds) — no need for a
 * min-heap-by-lane-end here.
 */
export function packLanes<T extends Interval>(items: T[]): (T & { lane: number })[] {
  const sorted = [...items].sort((a, b) => a.startMs - b.startMs);
  const laneEndMs: number[] = [];
  const packed: (T & { lane: number })[] = [];

  for (const item of sorted) {
    let lane = laneEndMs.findIndex((end) => end <= item.startMs);
    if (lane === -1) {
      lane = laneEndMs.length;
      laneEndMs.push(item.endMs);
    } else {
      laneEndMs[lane] = item.endMs;
    }
    packed.push({ ...item, lane });
  }

  return packed;
}

export function laneCount<T extends Interval>(items: (T & { lane: number })[]): number {
  return items.reduce((max, item) => Math.max(max, item.lane + 1), 0);
}

/**
 * Groups items by a key and packs lanes independently within each group.
 * Intended to be memoized on [items, groupBy] and never recomputed on
 * pan/zoom — recomputing per zoom step would visibly shuffle lanes.
 */
export function packLanesByGroup<T extends Interval>(
  items: T[],
  getGroupKey: (item: T) => string,
): Map<string, (T & { lane: number })[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getGroupKey(item);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  const result = new Map<string, (T & { lane: number })[]>();
  for (const [key, bucket] of groups) {
    result.set(key, packLanes(bucket));
  }
  return result;
}
