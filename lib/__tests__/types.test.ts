import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, LANGUAGES } from "../types";
import type { Snippet, SnippetInput, AppSettings, FilterType } from "../types";

describe("Types and Constants", () => {
  it("DEFAULT_SETTINGS has correct default values", () => {
    expect(DEFAULT_SETTINGS.bubbleSize).toBe("medium");
    expect(DEFAULT_SETTINGS.bubbleOpacity).toBe(0.8);
    expect(DEFAULT_SETTINGS.snapToEdge).toBe(true);
    expect(DEFAULT_SETTINGS.defaultView).toBe("pinned");
    expect(DEFAULT_SETTINGS.hapticFeedback).toBe(true);
  });

  it("LANGUAGES contains expected programming languages", () => {
    expect(LANGUAGES).toContain("Kotlin");
    expect(LANGUAGES).toContain("JavaScript");
    expect(LANGUAGES).toContain("TypeScript");
    expect(LANGUAGES).toContain("Python");
    expect(LANGUAGES).toContain("Bash");
    expect(LANGUAGES).toContain("SQL");
    expect(LANGUAGES).toContain("Other");
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(15);
  });

  it("Snippet type shape is valid when constructed", () => {
    const snippet: Snippet = {
      id: "test123",
      title: "Test Snippet",
      code: "console.log('hello');",
      language: "JavaScript",
      description: "A test snippet",
      tags: ["test", "demo"],
      isFavorite: false,
      isPinned: true,
      lastCopiedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(snippet.id).toBe("test123");
    expect(snippet.title).toBe("Test Snippet");
    expect(snippet.tags).toHaveLength(2);
    expect(snippet.isPinned).toBe(true);
    expect(snippet.isFavorite).toBe(false);
    expect(snippet.lastCopiedAt).toBeNull();
  });

  it("SnippetInput omits auto-generated fields", () => {
    const input: SnippetInput = {
      title: "New Snippet",
      code: "print('hi')",
      language: "Python",
      description: "",
      tags: [],
      isFavorite: false,
      isPinned: false,
    };

    // SnippetInput should NOT have id, createdAt, updatedAt, lastCopiedAt
    expect(input).not.toHaveProperty("id");
    expect(input).not.toHaveProperty("createdAt");
    expect(input).not.toHaveProperty("updatedAt");
    expect(input).not.toHaveProperty("lastCopiedAt");
  });

  it("FilterType accepts valid values", () => {
    const filters: FilterType[] = ["all", "pinned", "recent", "JavaScript", "Python"];
    expect(filters).toHaveLength(5);
    expect(filters[0]).toBe("all");
  });

  it("AppSettings shape is valid", () => {
    const settings: AppSettings = {
      bubbleSize: "large",
      bubbleOpacity: 0.5,
      snapToEdge: false,
      defaultView: "recent",
      hapticFeedback: false,
    };

    expect(settings.bubbleSize).toBe("large");
    expect(settings.bubbleOpacity).toBe(0.5);
    expect(settings.snapToEdge).toBe(false);
    expect(settings.defaultView).toBe("recent");
    expect(settings.hapticFeedback).toBe(false);
  });
});
