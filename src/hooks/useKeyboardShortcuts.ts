"use client";

import { useEffect, useCallback } from "react";

interface KeyboardActions {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onDeselect: () => void;
  onToggleExpand: () => void;
  onCenterSelected: () => void;
}

export function useKeyboardShortcuts(actions: KeyboardActions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "+":
        case "=":
          e.preventDefault();
          actions.onZoomIn();
          break;
        case "-":
          e.preventDefault();
          actions.onZoomOut();
          break;
        case "0":
          e.preventDefault();
          actions.onFitView();
          break;
        case "Escape":
          actions.onDeselect();
          break;
        case "Enter":
          e.preventDefault();
          actions.onToggleExpand();
          break;
        case "f":
          e.preventDefault();
          actions.onCenterSelected();
          break;
      }
    },
    [actions],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
