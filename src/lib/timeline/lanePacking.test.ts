import { describe, expect, it } from "vitest";
import { laneCount, packLanes, packLanesByGroup } from "./lanePacking";

describe("packLanes", () => {
  it("keeps non-overlapping items in the same lane", () => {
    const items = [
      { id: "a", startMs: 0, endMs: 10 },
      { id: "b", startMs: 10, endMs: 20 },
      { id: "c", startMs: 20, endMs: 30 },
    ];
    const packed = packLanes(items);
    expect(packed.every((i) => i.lane === 0)).toBe(true);
  });

  it("stacks overlapping items into separate lanes", () => {
    const items = [
      { id: "a", startMs: 0, endMs: 20 },
      { id: "b", startMs: 5, endMs: 15 },
      { id: "c", startMs: 10, endMs: 25 },
    ];
    const packed = packLanes(items);
    const laneById = Object.fromEntries(packed.map((i) => [i.id, i.lane]));
    expect(laneById.a).toBe(0);
    expect(laneById.b).toBe(1);
    // c starts at 10, before a's lane frees up at 20 and b's at 15 -> new lane
    expect(laneById.c).toBe(2);
  });

  it("reuses a freed lane once its previous occupant ends", () => {
    const items = [
      { id: "a", startMs: 0, endMs: 10 },
      { id: "b", startMs: 0, endMs: 20 },
      { id: "c", startMs: 10, endMs: 30 },
    ];
    const packed = packLanes(items);
    const laneById = Object.fromEntries(packed.map((i) => [i.id, i.lane]));
    expect(laneById.a).toBe(0);
    expect(laneById.b).toBe(1);
    expect(laneById.c).toBe(0); // reuses lane 0, freed when a ended at 10
  });

  it("handles an empty list", () => {
    expect(packLanes([])).toEqual([]);
  });
});

describe("laneCount", () => {
  it("returns the number of distinct lanes used", () => {
    const packed = packLanes([
      { startMs: 0, endMs: 20 },
      { startMs: 5, endMs: 15 },
    ]);
    expect(laneCount(packed)).toBe(2);
  });

  it("returns 0 for an empty list", () => {
    expect(laneCount([])).toBe(0);
  });
});

describe("packLanesByGroup", () => {
  it("packs lanes independently per group", () => {
    const items = [
      { id: "a", group: "x", startMs: 0, endMs: 20 },
      { id: "b", group: "x", startMs: 5, endMs: 15 },
      { id: "c", group: "y", startMs: 0, endMs: 20 },
    ];
    const grouped = packLanesByGroup(items, (i) => i.group);
    expect(grouped.get("x")?.map((i) => i.lane).sort()).toEqual([0, 1]);
    expect(grouped.get("y")?.map((i) => i.lane)).toEqual([0]);
  });
});
