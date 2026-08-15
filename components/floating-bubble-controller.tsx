import { useEffect } from "react";
import { Platform } from "react-native";

import { useSnippets } from "@/lib/snippet-context";
import {
  drainFloatingBubbleChanges,
  startFloatingBubble,
  stopFloatingBubble,
  updateFloatingBubbleSnippets,
  type FloatingBubbleSnippet,
} from "@/modules/floating-bubble/src/FloatingBubble";

function toFloatingSnippet(snippet: FloatingBubbleSnippet): FloatingBubbleSnippet {
  return {
    id: snippet.id,
    title: snippet.title,
    language: snippet.language,
    code: snippet.code,
    description: snippet.description,
    tags: snippet.tags,
    categoryId: snippet.categoryId,
    collectionIds: snippet.collectionIds,
    isFavorite: snippet.isFavorite,
    isPinned: snippet.isPinned,
    lastCopiedAt: snippet.lastCopiedAt,
    copyCount: snippet.copyCount,
    createdAt: snippet.createdAt,
    updatedAt: snippet.updatedAt,
  };
}

export function FloatingBubbleController() {
  const { state, applyOverlayChanges } = useSnippets();
  const { bubbleEnabled, bubbleSize, bubbleOpacity, snapToEdge } = state.settings;

  useEffect(() => {
    if (Platform.OS !== "android" || !state.loaded) return;

    let cancelled = false;
    const synchronize = async () => {
      if (!bubbleEnabled) {
        await stopFloatingBubble();
        return;
      }
      if (cancelled) return;
      const snippets = state.snippets.slice(0, 100).map(toFloatingSnippet);
      await startFloatingBubble({
        title: "Snippet Bubbles",
        snippets,
        size: bubbleSize,
        opacity: bubbleOpacity,
        snapToEdge,
      });
    };

    void synchronize();
    return () => {
      cancelled = true;
    };
  }, [bubbleEnabled, bubbleOpacity, bubbleSize, snapToEdge, state.loaded, state.snippets]);

  useEffect(() => {
    if (Platform.OS !== "android" || !state.loaded || !bubbleEnabled) return;
    void updateFloatingBubbleSnippets(state.snippets.slice(0, 100).map(toFloatingSnippet));
  }, [bubbleEnabled, state.loaded, state.snippets]);

  useEffect(() => {
    if (Platform.OS !== "android" || !state.loaded) return;

    let cancelled = false;
    const drainChanges = async () => {
      try {
        const raw = await drainFloatingBubbleChanges();
        if (cancelled || !raw || raw === "[]") return;
        const changes: unknown = JSON.parse(raw);
        if (Array.isArray(changes) && changes.length > 0) applyOverlayChanges(changes);
      } catch {
        // A malformed native handoff must never crash the app or block the overlay.
      }
    };

    void drainChanges();
    const interval = setInterval(() => void drainChanges(), 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [applyOverlayChanges, state.loaded]);

  return null;
}
