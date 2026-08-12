import { useEffect } from "react";
import { Platform } from "react-native";
import { useSnippets } from "@/lib/snippet-context";
import {
  startFloatingBubble,
  stopFloatingBubble,
  updateFloatingBubbleSnippets,
  type FloatingBubbleSnippet,
} from "@/modules/floating-bubble/src/FloatingBubble";

export function FloatingBubbleController() {
  const { state } = useSnippets();
  const { bubbleEnabled, bubbleSize, bubbleOpacity, snapToEdge } = state.settings;

  useEffect(() => {
    if (Platform.OS !== "android" || !state.loaded) return;

    let cancelled = false;
    const snippets: FloatingBubbleSnippet[] = state.snippets.slice(0, 30).map((snippet) => ({
      id: snippet.id,
      title: snippet.title,
      language: snippet.language,
      code: snippet.code,
    }));

    const synchronize = async () => {
      if (!bubbleEnabled) {
        await stopFloatingBubble();
        return;
      }
      if (cancelled) return;
      const started = await startFloatingBubble({
        title: "Snippet Bubbles",
        snippets,
        size: bubbleSize,
        opacity: bubbleOpacity,
        snapToEdge,
      });
      if (started && !cancelled) {
        await updateFloatingBubbleSnippets(snippets);
      }
    };

    void synchronize();
    return () => {
      cancelled = true;
    };
  }, [bubbleEnabled, bubbleOpacity, bubbleSize, snapToEdge, state.loaded, state.snippets]);

  return null;
}
