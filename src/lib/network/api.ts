import type { NetworkGraph } from "@/types/network";

export async function fetchNetworkGraph(teamId: string): Promise<NetworkGraph> {
  const res = await fetch(`/api/network/${teamId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load network graph");
  }
  return res.json();
}
