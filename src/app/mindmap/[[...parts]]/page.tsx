import { MindMapCanvas } from "@/components/mindmap/MindMapCanvas";

/** Optional catch-all so `/mindmap` and `/mindmap/workspace/…/list/…` share one page. */
export default function MindmapPage() {
  return <MindMapCanvas />;
}
