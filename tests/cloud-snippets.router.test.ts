import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listOwnedSnippets: vi.fn(),
  upsertOwnedSnippet: vi.fn(),
  softDeleteOwnedSnippet: vi.fn(),
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
});
