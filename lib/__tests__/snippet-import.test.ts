import { describe, expect, it } from "vitest";

import { parseSnippetImport, planSnippetImport } from "../snippet-import";

const rawExport = {
  version: 1,
  snippets: [
    { title: "Fetch", code: "fetch('/api')", language: "TypeScript", tags: ["api", "api"], createdAt: 100 },
    { title: "", code: "missing title" },
    { title: "Bad", code: 42 },
  ],
};

describe("snippet import planner", () => {
  it("validates records and returns recovery detail without discarding valid snippets", () => {
    const parsed = parseSnippetImport(rawExport, 500);
    expect(parsed.snippets).toHaveLength(1);
    expect(parsed.snippets[0]).toMatchObject({ title: "Fetch", tags: ["api"], language: "TypeScript" });
    expect(parsed.rejected).toEqual([
      { index: 1, reason: "Title is required." },
      { index: 2, reason: "Code is required." },
    ]);
  });

  it("supports skip, replace, and copy duplicate decisions deterministically", () => {
    const parsed = parseSnippetImport(rawExport, 500);
    const existing = [{ ...parsed.snippets[0], id: "existing", createdAt: 1, updatedAt: 1 }];

    expect(planSnippetImport(existing, parsed, "skip", 900)).toMatchObject({ imported: 0, skipped: 1, snippets: [{ id: "existing" }] });
    expect(planSnippetImport(existing, parsed, "replace", 900)).toMatchObject({ replaced: 1, snippets: [{ id: "existing", updatedAt: 900 }] });
    const copyPlan = planSnippetImport(existing, parsed, "copy", 900);
    expect(copyPlan.copied).toBe(1);
    expect(copyPlan.snippets[0]).toMatchObject({ title: "Fetch (Imported Copy)" });
  });

  it("rejects a non-export payload with a human-readable recovery reason", () => {
    expect(parseSnippetImport({ nonsense: true })).toMatchObject({
      snippets: [],
      rejected: [{ index: -1, reason: "Expected a JSON array or an object with a snippets array." }],
    });
  });
});
