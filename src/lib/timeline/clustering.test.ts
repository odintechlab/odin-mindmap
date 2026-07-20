import { describe, expect, it } from "vitest";
import { clusterVisibleBars } from "./clustering";

describe("clusterVisibleBars", () => {
  it("keeps well-separated bars as singles", () => {
    const bars = [
      { item: "a", x1: 0, x2: 20 },
      { item: "b", x1: 100, x2: 120 },
    ];
    const nodes = clusterVisibleBars(bars, 5, 4);
    expect(nodes.map((n) => n.type)).toEqual(["single", "single"]);
  });

  it("merges bars closer than clusterGapPx into a cluster", () => {
    const bars = [
      { item: "a", x1: 0, x2: 10 },
      { item: "b", x1: 12, x2: 20 },
    ];
    const nodes = clusterVisibleBars(bars, 5, 4);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("cluster");
    if (nodes[0].type === "cluster") {
      expect(nodes[0].members).toEqual(["a", "b"]);
    }
  });

  it("chains three overlapping-gap bars into one cluster", () => {
    const bars = [
      { item: "a", x1: 0, x2: 10 },
      { item: "b", x1: 11, x2: 20 },
      { item: "c", x1: 21, x2: 30 },
    ];
    const nodes = clusterVisibleBars(bars, 5, 4);
    expect(nodes).toHaveLength(1);
    if (nodes[0].type === "cluster") {
      expect(nodes[0].members).toEqual(["a", "b", "c"]);
    }
  });

  it("enforces a minimum single-bar width", () => {
    const bars = [{ item: "a", x1: 0, x2: 1 }];
    const nodes = clusterVisibleBars(bars, 8, 4);
    expect(nodes[0]).toMatchObject({ type: "single", x1: 0, x2: 8 });
  });

  it("handles an empty list", () => {
    expect(clusterVisibleBars([], 5, 4)).toEqual([]);
  });
});
