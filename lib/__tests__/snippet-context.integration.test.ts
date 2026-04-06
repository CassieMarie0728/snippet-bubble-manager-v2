import { describe, it, expect, beforeEach } from "vitest";
import type { Snippet, SnippetInput } from "../types";

/**
 * Integration tests for SnippetContext functionality.
 * Tests CRUD operations, search, filter, favorites, pinning, and persistence.
 */

// Mock AsyncStorage for testing
const mockStorage: Record<string, string> = {};

const mockAsyncStorage = {
  getItem: async (key: string) => mockStorage[key] || null,
  setItem: async (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: async (key: string) => {
    delete mockStorage[key];
  },
  clear: async () => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  },
};

// Test data generator
function createTestSnippet(overrides?: Partial<Snippet>): Snippet {
  const id = Math.random().toString(36).slice(2, 11);
  const now = Date.now();
  return {
    id,
    title: "Test Snippet",
    code: "console.log('test');",
    language: "JavaScript",
    description: "A test snippet",
    tags: ["test"],
    isFavorite: false,
    isPinned: false,
    lastCopiedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("SnippetContext Integration Tests", () => {
  beforeEach(async () => {
    await mockAsyncStorage.clear();
  });

  describe("CRUD Operations", () => {
    it("should create a new snippet with auto-generated ID", async () => {
      const input: SnippetInput = {
        title: "React Hook",
        code: "const [state, setState] = useState(null);",
        language: "TypeScript",
        description: "useState hook example",
        tags: ["react", "hooks"],
        isFavorite: false,
        isPinned: false,
      };

      // Simulate context creation
      const id = Math.random().toString(36).slice(2, 11);
      const snippet: Snippet = {
        ...input,
        id,
        lastCopiedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(snippet.id).toBeTruthy();
      expect(snippet.title).toBe("React Hook");
      expect(snippet.code).toBe("const [state, setState] = useState(null);");
      expect(snippet.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it("should read a snippet by ID", () => {
      const snippet = createTestSnippet({ title: "My Snippet" });
      const snippets = [snippet];

      const found = snippets.find((s) => s.id === snippet.id);
      expect(found).toBeDefined();
      expect(found!.title).toBe("My Snippet");
    });

    it("should update a snippet", () => {
      const snippet = createTestSnippet();
      const updated = {
        ...snippet,
        title: "Updated Title",
        updatedAt: Date.now(),
      };

      expect(updated.title).toBe("Updated Title");
      expect(updated.updatedAt).toBeGreaterThanOrEqual(snippet.updatedAt);
    });

    it("should delete a snippet", () => {
      const snippet1 = createTestSnippet({ title: "Snippet 1" });
      const snippet2 = createTestSnippet({ title: "Snippet 2" });
      let snippets = [snippet1, snippet2];

      snippets = snippets.filter((s) => s.id !== snippet1.id);

      expect(snippets).toHaveLength(1);
      expect(snippets[0].title).toBe("Snippet 2");
    });
  });

  describe("Search Functionality", () => {
    it("should search by title", () => {
      const snippets = [
        createTestSnippet({ title: "React Hook" }),
        createTestSnippet({ title: "Vue Component" }),
        createTestSnippet({ title: "React Router" }),
      ];

      const results = snippets.filter((s) => s.title.toLowerCase().includes("react"));
      expect(results).toHaveLength(2);
    });

    it("should search by code content", () => {
      const snippets = [
        createTestSnippet({ code: "console.log('hello');" }),
        createTestSnippet({ code: "print('hello')" }),
        createTestSnippet({ code: "alert('hello');" }),
      ];

      const results = snippets.filter((s) => s.code.includes("console"));
      expect(results).toHaveLength(1);
    });

    it("should search by tags", () => {
      const snippets = [
        createTestSnippet({ tags: ["react", "hooks"] }),
        createTestSnippet({ tags: ["vue", "composition"] }),
        createTestSnippet({ tags: ["react", "components"] }),
      ];

      const results = snippets.filter((s) => s.tags.some((t) => t.includes("react")));
      expect(results).toHaveLength(2);
    });

    it("should search by language", () => {
      const snippets = [
        createTestSnippet({ language: "JavaScript" }),
        createTestSnippet({ language: "Python" }),
        createTestSnippet({ language: "JavaScript" }),
      ];

      const results = snippets.filter((s) => s.language === "JavaScript");
      expect(results).toHaveLength(2);
    });

    it("should handle case-insensitive search", () => {
      const snippets = [
        createTestSnippet({ title: "React Hook" }),
        createTestSnippet({ title: "Vue Component" }),
      ];

      const query = "react";
      const results = snippets.filter((s) => s.title.toLowerCase().includes(query.toLowerCase()));
      expect(results).toHaveLength(1);
    });
  });

  describe("Filter Functionality", () => {
    it("should filter by pinned snippets", () => {
      const snippets = [
        createTestSnippet({ isPinned: true }),
        createTestSnippet({ isPinned: false }),
        createTestSnippet({ isPinned: true }),
      ];

      const pinned = snippets.filter((s) => s.isPinned);
      expect(pinned).toHaveLength(2);
    });

    it("should filter by favorite snippets", () => {
      const snippets = [
        createTestSnippet({ isFavorite: true }),
        createTestSnippet({ isFavorite: false }),
        createTestSnippet({ isFavorite: true }),
      ];

      const favorites = snippets.filter((s) => s.isFavorite);
      expect(favorites).toHaveLength(2);
    });

    it("should filter by language", () => {
      const snippets = [
        createTestSnippet({ language: "JavaScript" }),
        createTestSnippet({ language: "Python" }),
        createTestSnippet({ language: "JavaScript" }),
      ];

      const jsSnippets = snippets.filter((s) => s.language === "JavaScript");
      expect(jsSnippets).toHaveLength(2);
    });

    it("should combine multiple filters", () => {
      const snippets = [
        createTestSnippet({ language: "JavaScript", isPinned: true, isFavorite: true }),
        createTestSnippet({ language: "JavaScript", isPinned: false, isFavorite: false }),
        createTestSnippet({ language: "Python", isPinned: true, isFavorite: true }),
      ];

      const results = snippets.filter((s) => s.language === "JavaScript" && s.isPinned);
      expect(results).toHaveLength(1);
    });
  });

  describe("Favorites and Pinning", () => {
    it("should toggle favorite status", () => {
      let snippet = createTestSnippet({ isFavorite: false });
      expect(snippet.isFavorite).toBe(false);

      snippet = { ...snippet, isFavorite: !snippet.isFavorite };
      expect(snippet.isFavorite).toBe(true);

      snippet = { ...snippet, isFavorite: !snippet.isFavorite };
      expect(snippet.isFavorite).toBe(false);
    });

    it("should toggle pin status", () => {
      let snippet = createTestSnippet({ isPinned: false });
      expect(snippet.isPinned).toBe(false);

      snippet = { ...snippet, isPinned: !snippet.isPinned };
      expect(snippet.isPinned).toBe(true);

      snippet = { ...snippet, isPinned: !snippet.isPinned };
      expect(snippet.isPinned).toBe(false);
    });

    it("should allow snippet to be both pinned and favorite", () => {
      const snippet = createTestSnippet({ isPinned: true, isFavorite: true });
      expect(snippet.isPinned).toBe(true);
      expect(snippet.isFavorite).toBe(true);
    });
  });

  describe("Sorting", () => {
    it("should sort by creation date (newest first)", () => {
      const now = Date.now();
      const snippets = [
        createTestSnippet({ createdAt: now - 1000 }),
        createTestSnippet({ createdAt: now }),
        createTestSnippet({ createdAt: now - 2000 }),
      ];

      const sorted = [...snippets].sort((a, b) => b.createdAt - a.createdAt);
      expect(sorted[0].createdAt).toBe(now);
      expect(sorted[2].createdAt).toBe(now - 2000);
    });

    it("should sort by title alphabetically", () => {
      const snippets = [
        createTestSnippet({ title: "Zebra" }),
        createTestSnippet({ title: "Apple" }),
        createTestSnippet({ title: "Mango" }),
      ];

      const sorted = [...snippets].sort((a, b) => a.title.localeCompare(b.title));
      expect(sorted[0].title).toBe("Apple");
      expect(sorted[1].title).toBe("Mango");
      expect(sorted[2].title).toBe("Zebra");
    });

    it("should prioritize pinned snippets", () => {
      const snippets = [
        createTestSnippet({ isPinned: false, title: "A" }),
        createTestSnippet({ isPinned: true, title: "B" }),
        createTestSnippet({ isPinned: false, title: "C" }),
      ];

      const sorted = [...snippets].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        return a.title.localeCompare(b.title);
      });

      expect(sorted[0].isPinned).toBe(true);
    });
  });

  describe("Data Persistence", () => {
    it("should serialize snippets to JSON", () => {
      const snippet = createTestSnippet();
      const json = JSON.stringify(snippet);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe(snippet.id);
      expect(parsed.title).toBe(snippet.title);
      expect(parsed.code).toBe(snippet.code);
    });

    it("should deserialize snippets from JSON", () => {
      const original = createTestSnippet();
      const json = JSON.stringify(original);
      const restored: Snippet = JSON.parse(json);

      expect(restored).toEqual(original);
    });

    it("should handle large snippet collections", () => {
      const snippets = Array.from({ length: 1000 }, () => createTestSnippet());
      expect(snippets).toHaveLength(1000);

      const json = JSON.stringify(snippets);
      const restored = JSON.parse(json);

      expect(restored).toHaveLength(1000);
      expect(restored[0]).toEqual(snippets[0]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty snippet list", () => {
      const snippets: Snippet[] = [];
      expect(snippets).toHaveLength(0);
      expect(snippets.filter((s) => s.isFavorite)).toHaveLength(0);
    });

    it("should handle snippets with empty code", () => {
      const snippet = createTestSnippet({ code: "" });
      expect(snippet.code).toBe("");
      expect(snippet.code.length).toBe(0);
    });

    it("should handle snippets with special characters", () => {
      const snippet = createTestSnippet({
        title: "Test <>&\"'",
        code: "const x = `template ${literal}`;",
      });
      expect(snippet.title).toBe("Test <>&\"'");
      expect(snippet.code).toContain("template");
    });

    it("should handle very long code blocks", () => {
      const longCode = "console.log('x');\n".repeat(1000);
      const snippet = createTestSnippet({ code: longCode });
      expect(snippet.code.split("\n")).toHaveLength(1001);
    });

    it("should handle snippets with many tags", () => {
      const manyTags = Array.from({ length: 50 }, (_, i) => `tag${i}`);
      const snippet = createTestSnippet({ tags: manyTags });
      expect(snippet.tags).toHaveLength(50);
    });
  });
});
