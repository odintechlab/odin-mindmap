"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

interface NetworkInteractionContextValue {
  activeId: string | null;
  neighborIds: Set<string> | null;
  focusedId: string | null;
}

const NetworkInteractionContext =
  createContext<NetworkInteractionContextValue>({
    activeId: null,
    neighborIds: null,
    focusedId: null,
  });

export function NetworkInteractionProvider({
  hoveredId,
  focusedId,
  neighborIds,
  children,
}: {
  hoveredId: string | null;
  focusedId: string | null;
  neighborIds: Set<string> | null;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      activeId: hoveredId ?? focusedId,
      neighborIds,
      focusedId,
    }),
    [hoveredId, focusedId, neighborIds],
  );

  return (
    <NetworkInteractionContext.Provider value={value}>
      {children}
    </NetworkInteractionContext.Provider>
  );
}

export function useNetworkInteraction() {
  return useContext(NetworkInteractionContext);
}
