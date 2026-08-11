import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => void store.set(key, value)),
  },
}));

import {
  acknowledgeSyncOperations,
  enqueueSnippetUpsert,
  markSyncConflicts,
  readSyncCursor,
  readSyncQueue,
  writeSyncCursor,
} from "../sync-queue";

const payload = {
  clientId: "local-snippet",
  title: "Queue me",
  code: "const queued = true;",
  language: "TypeScript",
  description: "",
  tags: [],
  isFavorite: false,
  isPinned: false,
  lastCopiedAt: null,
};

describe("persistent sync queue", () => {
  beforeEach(() => store.clear());

  it("coalesces repeated local writes for the same pending snippet", async () => {
    const first = await enqueueSnippetUpsert(payload, 2);
    const second = await enqueueSnippetUpsert({ ...payload, title: "Newest title" }, 99);
    const queue = await readSyncQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ operationId: first.operationId, baseRevision: 2 });
    expect((second.payload as typeof payload).title).toBe("Newest title");
  });

  it("removes acknowledgements and retains conflicts for explicit recovery", async () => {
    const operation = await enqueueSnippetUpsert(payload, 0);
    await markSyncConflicts([operation.operationId]);
    expect((await readSyncQueue())[0]?.status).toBe("conflict");

    await acknowledgeSyncOperations([operation.operationId]);
    await expect(readSyncQueue()).resolves.toEqual([]);
  });

  it("persists a valid monotonic sync cursor", async () => {
    expect(await readSyncCursor()).toBe(0);
    await writeSyncCursor(42);
    expect(await readSyncCursor()).toBe(42);
  });
});
