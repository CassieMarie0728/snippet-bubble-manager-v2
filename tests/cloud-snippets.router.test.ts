import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listOwnedSnippets: vi.fn(),
  upsertOwnedSnippet: vi.fn(),
  softDeleteOwnedSnippet: vi.fn(),
  applySyncOperation: vi.fn(),
  pullSyncChanges: vi.fn(),
  listOwnedSyncConflicts: vi.fn(),
  createOwnedShare: vi.fn(),
  listOwnedShares: vi.fn(),
  revokeOwnedShare: vi.fn(),
  getPublicShare: vi.fn(),
  listOwnedCategories: vi.fn(),
  upsertOwnedCategory: vi.fn(),
  softDeleteOwnedCategory: vi.fn(),
  listOwnedCollections: vi.fn(),
  upsertOwnedCollection: vi.fn(),
  softDeleteOwnedCollection: vi.fn(),
}));

vi.mock("../server/db", () => dbMocks);

import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

const user = {
  id: 42,
  openId: "cloud-owner",
  email: "owner@example.com",
  name: "Cloud Owner",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createContext(authenticated = true): TrpcContext {
  return {
    user: authenticated ? user : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const snippetInput = {
  clientId: "123e4567-e89b-42d3-a456-426614174000",
  title: "Cloud-safe snippet",
  code: "const shipIt = true;",
  language: "TypeScript",
  description: "A test snippet",
  tags: ["cloud", "test"],
  isFavorite: true,
  isPinned: false,
  lastCopiedAt: 1_700_000_000_000,
};

describe("cloud snippet router", () => {
  it("rejects unauthenticated cloud access", async () => {
    const caller = appRouter.createCaller(createContext(false));

    await expect(caller.snippets.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMocks.listOwnedSnippets).not.toHaveBeenCalled();
  });

  it("scopes snippet listing to the authenticated owner", async () => {
    dbMocks.listOwnedSnippets.mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.snippets.list()).resolves.toEqual([]);
    expect(dbMocks.listOwnedSnippets).toHaveBeenCalledWith(user.id);
  });

  it("passes a bounded, server-normalized upsert to the owner-scoped helper", async () => {
    dbMocks.upsertOwnedSnippet.mockResolvedValueOnce({
      clientId: snippetInput.clientId,
      revision: 1,
      created: true,
    });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.snippets.upsert(snippetInput)).resolves.toMatchObject({
      clientId: snippetInput.clientId,
      created: true,
    });
    expect(dbMocks.upsertOwnedSnippet).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        clientId: snippetInput.clientId,
        lastCopiedAt: new Date(snippetInput.lastCopiedAt),
      }),
    );
  });

  it("rejects blank client identifiers before any database call", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.snippets.remove({ clientId: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(dbMocks.softDeleteOwnedSnippet).not.toHaveBeenCalled();
  });

  it("passes a validated operation batch to the authenticated user's sync processor", async () => {
    dbMocks.applySyncOperation.mockResolvedValueOnce({
      status: "acknowledged",
      operationId: "123e4567-e89b-42d3-a456-426614174001",
      duplicate: false,
      revision: 1,
    });
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.sync.push({
        operations: [
          {
            operationId: "123e4567-e89b-42d3-a456-426614174001",
            entityType: "snippet",
            operationType: "upsert",
            entityClientId: snippetInput.clientId,
            baseRevision: 0,
            payload: snippetInput,
          },
        ],
      }),
    ).resolves.toMatchObject({ results: [{ status: "acknowledged" }] });
    expect(dbMocks.applySyncOperation).toHaveBeenCalledWith(
      user.id,
      expect.objectContaining({
        entityClientId: snippetInput.clientId,
        payload: expect.objectContaining({ clientId: snippetInput.clientId }),
      }),
    );
  });

  it("pulls changes using the authenticated owner's cursor only", async () => {
    dbMocks.pullSyncChanges.mockResolvedValueOnce({ changes: [], nextCursor: 12, hasMore: false });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.sync.pull({ cursor: 12, limit: 25 })).resolves.toMatchObject({ nextCursor: 12 });
    expect(dbMocks.pullSyncChanges).toHaveBeenCalledWith(user.id, 12, 25);
  });

  it("creates durable shares only for the authenticated owner", async () => {
    dbMocks.createOwnedShare.mockResolvedValueOnce({
      token: "x".repeat(32),
      snapshot: snippetInput,
      maxViews: 5,
      expiresAt: null,
    });
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.shares.create({ snippetClientId: snippetInput.clientId, maxViews: 5 }),
    ).resolves.toMatchObject({ token: "x".repeat(32) });
    expect(dbMocks.createOwnedShare).toHaveBeenCalledWith(
      user.id,
      snippetInput.clientId,
      expect.objectContaining({ maxViews: 5 }),
    );
  });

  it("does not allow anonymous callers to create or list shares", async () => {
    const caller = appRouter.createCaller(createContext(false));

    await expect(caller.shares.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.shares.create({ snippetClientId: snippetInput.clientId })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("returns a public snapshot without exposing owner identity", async () => {
    dbMocks.getPublicShare.mockResolvedValueOnce({
      snapshot: snippetInput,
      viewCount: 1,
      maxViews: null,
      expiresAt: null,
    });
    const caller = appRouter.createCaller(createContext(false));

    await expect(caller.shares.resolve({ token: "y".repeat(32) })).resolves.toMatchObject({
      snapshot: expect.objectContaining({ clientId: snippetInput.clientId }),
      viewCount: 1,
    });
    expect(dbMocks.getPublicShare).toHaveBeenCalledWith("y".repeat(32));
  });

  it("scopes category and collection reads to the authenticated owner", async () => {
    dbMocks.listOwnedCategories.mockResolvedValueOnce([]);
    dbMocks.listOwnedCollections.mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.categories.list()).resolves.toEqual([]);
    await expect(caller.collections.list()).resolves.toEqual([]);
    expect(dbMocks.listOwnedCategories).toHaveBeenCalledWith(user.id);
    expect(dbMocks.listOwnedCollections).toHaveBeenCalledWith(user.id);
  });

  it("rejects anonymous category and collection mutations", async () => {
    const caller = appRouter.createCaller(createContext(false));

    await expect(caller.categories.upsert({ clientId: "cat-1", name: "Secrets" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller.collections.upsert({ clientId: "col-1", name: "Launch" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
