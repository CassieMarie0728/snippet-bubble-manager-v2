import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

export type FloatingBubbleSnippet = {
  id: string;
  title: string;
  language: string;
  code: string;
};

type FloatingBubbleNativeModule = {
  isSupported(): boolean;
  canDrawOverlays(): Promise<boolean>;
  requestOverlayPermission(): Promise<boolean>;
  start(options: {
    title: string;
    snippets: FloatingBubbleSnippet[];
    size: "small" | "medium" | "large";
    opacity: number;
    snapToEdge: boolean;
  }): Promise<boolean>;
  updateSnippets(snippets: FloatingBubbleSnippet[]): Promise<void>;
  stop(): Promise<void>;
};

const nativeModule =
  Platform.OS === "android"
    ? requireOptionalNativeModule<FloatingBubbleNativeModule>("SnippetBubblesFloatingBubble")
    : null;

export function isFloatingBubbleSupported(): boolean {
  return Boolean(nativeModule?.isSupported());
}

export async function canDrawOverlays(): Promise<boolean> {
  return nativeModule?.canDrawOverlays() ?? false;
}

export async function requestOverlayPermission(): Promise<boolean> {
  return nativeModule?.requestOverlayPermission() ?? false;
}

export async function startFloatingBubble(options: {
  title: string;
  snippets: FloatingBubbleSnippet[];
  size: "small" | "medium" | "large";
  opacity: number;
  snapToEdge: boolean;
}): Promise<boolean> {
  return nativeModule?.start(options) ?? false;
}

export async function updateFloatingBubbleSnippets(
  snippets: FloatingBubbleSnippet[],
): Promise<void> {
  await nativeModule?.updateSnippets(snippets);
}

export async function stopFloatingBubble(): Promise<void> {
  await nativeModule?.stop();
}
