import { describe, expect, it } from "vitest";

import { normalizeOverlaySnippet } from "../snippet-context";
import type { Snippet } from "../types";

const existingSnippet: Snippet = {
  id: "existing-1",
  title: "Original title",
  code: "const original = true;",
  language: "TypeScript",
  description: "Keep this description",
  tags: ["existing"],
  categoryId: "frontend",
  collectionIds: ["favorites"],
  isFavorite: true,
  isPinned: true,
  lastCopiedAt: 100,
  copyCount: 4,
  createdAt: 100,
  updatedAt: 200,
};

describe("normalizeOverlaySnippet", () => {
  it("preserves existing metadata while applying native editor changes", () => {
    const normalized = normalizeOverlaySnippet(
      {
        id: "existing-1",
        title: "Edited from overlay",
        language: "TypeScript",
        code: "const edited = true;",
        updatedAt: 300,
      },
      [existingSnippet],
    );

    expect(normalized).toMatchObject({
      id: "existing-1",
      title: "Edited from overlay",
      code: "const edited = true;",
      language: "TypeScript",
      description: "Keep this description",
      tags: ["existing"],
      categoryId: "frontend",
      collectionIds: ["favorites"],
      isFavorite: true,
      isPinned: true,
      updatedAt: 300,
    });
  });

  it("creates a valid local snippet for a new overlay memo", () => {
    const normalized = normalizeOverlaySnippet(
      {
        id: "overlay-new",
        title: "Quick thought",
        language: "Plaintext",
        code: "Remember to ship the tiny useful thing.",
        tags: ["memo", 3],
        isPinned: false,
      },
      [],
    );

    expect(normalized).toMatchObject({
      id: "overlay-new",
      title: "Quick thought",
      language: "Plaintext",
      code: "Remember to ship the tiny useful thing.",
      description: "",
      tags: ["memo"],
      isFavorite: false,
      isPinned: false,
      lastCopiedAt: null,
    });
    expect(normalized?.createdAt).toEqual(expect.any(Number));
    expect(normalized?.updatedAt).toEqual(expect.any(Number));
  });

  it("rejects malformed native changes instead of mutating local state", () => {
    expect(normalizeOverlaySnippet(null, [])).toBeNull();
    expect(normalizeOverlaySnippet({ id: "missing-code" }, [])).toBeNull();
    expect(normalizeOverlaySnippet({ code: "missing-id" }, [])).toBeNull();
  });
});
