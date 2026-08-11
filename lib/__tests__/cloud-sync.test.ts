import { describe, expect, it } from "vitest";

import { mergeCloudSnippets, toCloudSnippetInput, type CloudSnippet } from "../cloud-sync";
import type { Snippet } from "../types";

const localSnippet: Snippet = {
  id: "legacy-local-id",
  title: "Local",
  code: "const local = true;",
  language: "TypeScript",
  description: "",
  tags: ["local"],
  isFavorite: false,
  isPinned: false,
  lastCopiedAt: null,
  copyCount: 0,
  createdAt: 100,
  updatedAt: 200,
};

const remoteSnippet: CloudSnippet = {
  ...toCloudSnippetInput(localSnippet),
  revision: 1,
  deletedAt: null,
  createdAt: new Date(100),
  updatedAt: new Date(150),
};

describe("cloud sync merge", () => {
  it("accepts legacy local IDs while converting a snippet into a cloud payload", () => {
    expect(toCloudSnippetInput(localSnippet).clientId).toBe("legacy-local-id");
  });

  it("keeps the newer local record and schedules it for upload", () => {
    const result = mergeCloudSnippets([localSnippet], [remoteSnippet]);
    expect(result.merged).toEqual([localSnippet]);
    expect(result.upload).toEqual([localSnippet]);
    expect(result.conflicts[0]?.resolution).toBe("local-wins");
  });

  it("accepts a newer remote record and records the explicit resolution", () => {
    const newerRemote = { ...remoteSnippet, title: "Remote", updatedAt: new Date(300) };
    const result = mergeCloudSnippets([localSnippet], [newerRemote]);
    expect(result.merged[0]?.title).toBe("Remote");
    expect(result.upload).toHaveLength(0);
    expect(result.conflicts[0]?.resolution).toBe("remote-wins");
  });

  it("queues local-only snippets and adds remote-only snippets to the merged library", () => {
    const remoteOnly = { ...remoteSnippet, clientId: "remote-only", title: "Remote only" };
    const result = mergeCloudSnippets([localSnippet], [remoteOnly]);
    expect(result.upload).toEqual([localSnippet]);
    expect(result.merged.map((snippet) => snippet.id)).toEqual(["remote-only", "legacy-local-id"]);
  });
});
