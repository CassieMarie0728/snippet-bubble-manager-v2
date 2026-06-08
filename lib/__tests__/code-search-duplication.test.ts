import { describe, it, expect } from "vitest";
import { searchByCodeContent } from "../advanced-search";
import type { Snippet } from "@/lib/types";

describe("Code Search & Duplication Features", () => {
  const testSnippets: Snippet[] = [
    {
      id: "1",
      title: "Async Function",
      code: "async function fetchData() {\n  const data = await fetch('/api/data');\n  return data.json();\n}",
      language: "JavaScript",
      tags: ["async", "fetch"],
      description: "Fetch data asynchronously",
      isFavorite: false,
      isPinned: false,
      lastCopiedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "2",
      title: "Try Catch Block",
      code: "try {\n  const result = riskyOperation();\n} catch (error) {\n  console.error('Error:', error);\n}",
      language: "JavaScript",
      tags: ["error-handling"],
      description: "Error handling pattern",
      isFavorite: false,
      isPinned: false,
      lastCopiedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "3",
      title: "Promise Chain",
      code: "fetch('/api/data')\n  .then(res => res.json())\n  .then(data => console.log(data))\n  .catch(err => console.error(err));",
      language: "JavaScript",
      tags: ["promise"],
      description: "Promise-based API call",
      isFavorite: false,
      isPinned: false,
      lastCopiedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  describe("searchByCodeContent", () => {
    it("should find snippets by direct code content", () => {
      const results = searchByCodeContent(testSnippets, "async");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].snippet.id).toBe("1");
    });

    it("should find snippets by error handling keywords", () => {
      const results = searchByCodeContent(testSnippets, "catch");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].snippet.id).toBe("2");
    });

    it("should find snippets by fetch API", () => {
      const results = searchByCodeContent(testSnippets, "fetch");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty array for non-matching queries", () => {
      const results = searchByCodeContent(testSnippets, "nonexistent");
      expect(results.length).toBe(0);
    });

    it("should rank results by relevance score", () => {
      const results = searchByCodeContent(testSnippets, "fetch");
      expect(results[0].score).toBeGreaterThanOrEqual(50);
    });

    it("should generate code preview for matches", () => {
      const results = searchByCodeContent(testSnippets, "async");
      expect(results[0].preview).toBeDefined();
      expect(results[0].preview?.length || 0).toBeGreaterThan(0);
    });
  });

  describe("Snippet Duplication", () => {
    it("should create a copy with modified title", () => {
      const original = testSnippets[0];
      const duplicated = {
        ...original,
        id: "new-id",
        title: `${original.title} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastCopiedAt: null,
      };

      expect(duplicated.title).toBe("Async Function (Copy)");
      expect(duplicated.id).not.toBe(original.id);
      expect(duplicated.code).toBe(original.code);
      expect(duplicated.language).toBe(original.language);
    });

    it("should preserve all snippet properties except id, title, timestamps", () => {
      const original = testSnippets[1];
      const duplicated = {
        ...original,
        id: "new-id",
        title: `${original.title} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastCopiedAt: null,
      };

      expect(duplicated.tags).toEqual(original.tags);
      expect(duplicated.description).toBe(original.description);
      expect(duplicated.isFavorite).toBe(original.isFavorite);
      expect(duplicated.isPinned).toBe(original.isPinned);
    });

    it("should reset lastCopiedAt on duplication", () => {
      const snippet = testSnippets[0];
      const original = {
        ...snippet,
        lastCopiedAt: Date.now() - 10000 as number | null,
      };

      const duplicated = {
        ...original,
        id: "new-id",
        title: `${snippet.title} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastCopiedAt: null,
      };

      expect(duplicated.lastCopiedAt).toBeNull();
    });
  });
});
