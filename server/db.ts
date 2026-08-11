import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import {
  aiQuotaWindows,
  aiRequestEvents,
  categories,
  collections,
  InsertUser,
  snippets,
  snippetTags,
  snippetVersions,
  shares,
  syncChanges,
  syncConflicts,
  syncOperations,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export type AiQuotaScope = {
  userId: number | null;
  scopeType: "account" | "anonymous";
  scopeHash: string;
};

type AiQuotaWindowType = "hour" | "day";

export type AiQuotaStatus = {
  hourly: { limit: number; used: number; remaining: number; resetsAt: Date };
  daily: { limit: number; used: number; remaining: number; resetsAt: Date };
};

export type AiRequestTelemetry = {
  userId: number | null;
  scopeType: "account" | "anonymous";
  scopeHash: string;
  procedure: "generate" | "explain" | "convert" | "generateRelated";
  outcome: "succeeded" | "rejected" | "failed";
  promptCharacters: number;
  messageCount: number;
  quotaWindowStart: Date;
  responseCharacters?: number | null;
  durationMs?: number | null;
  failureCode?: string | null;
};

const AI_QUOTA_POLICY = {
  account: { hour: 24, day: 200 },
  anonymous: { hour: 8, day: 24 },
} as const;

function getAiWindowStart(now: Date, windowType: AiQuotaWindowType) {
  if (windowType === "hour") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()));
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function getAiWindowResetAt(windowStart: Date, windowType: AiQuotaWindowType) {
  const duration = windowType === "hour" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return new Date(windowStart.getTime() + duration);
}

function toQuotaWindowStatus(limit: number, used: number, windowStart: Date, windowType: AiQuotaWindowType) {
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt: getAiWindowResetAt(windowStart, windowType),
  };
}

async function readAiQuotaStatus(scope: AiQuotaScope, now: Date): Promise<AiQuotaStatus> {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");

  const rows = await database
    .select({ windowType: aiQuotaWindows.windowType, windowStart: aiQuotaWindows.windowStart, requestCount: aiQuotaWindows.requestCount })
    .from(aiQuotaWindows)
    .where(
      and(
        eq(aiQuotaWindows.scopeType, scope.scopeType),
        eq(aiQuotaWindows.scopeHash, scope.scopeHash),
        or(
          and(
            eq(aiQuotaWindows.windowType, "hour"),
            eq(aiQuotaWindows.windowStart, getAiWindowStart(now, "hour")),
          ),
          and(
            eq(aiQuotaWindows.windowType, "day"),
            eq(aiQuotaWindows.windowStart, getAiWindowStart(now, "day")),
          ),
        ),
      ),
    );

  const usage = new Map(rows.map((row) => [row.windowType, row.requestCount]));
  const policy = AI_QUOTA_POLICY[scope.scopeType];
  return {
    hourly: toQuotaWindowStatus(policy.hour, usage.get("hour") ?? 0, getAiWindowStart(now, "hour"), "hour"),
    daily: toQuotaWindowStatus(policy.day, usage.get("day") ?? 0, getAiWindowStart(now, "day"), "day"),
  };
}

/**
 * Atomically reserves one request from both fixed windows. The conditional
 * upsert prevents a concurrent request from exceeding either policy limit.
 */
export async function reserveAiQuota(scope: AiQuotaScope, now = new Date()) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");

  const policy = AI_QUOTA_POLICY[scope.scopeType];
  const windows = ["hour", "day"] as const;
  let rejectedWindow: AiQuotaWindowType | null = null;

  await database.transaction(async (tx) => {
    for (const windowType of windows) {
      const limit = policy[windowType];
      const windowStart = getAiWindowStart(now, windowType);
      const result = await tx.execute(sql`
        INSERT INTO ${aiQuotaWindows} (
          ${aiQuotaWindows.userId},
          ${aiQuotaWindows.scopeType},
          ${aiQuotaWindows.scopeHash},
          ${aiQuotaWindows.windowType},
          ${aiQuotaWindows.windowStart},
          ${aiQuotaWindows.requestCount}
        ) VALUES (
          ${scope.userId},
          ${scope.scopeType},
          ${scope.scopeHash},
          ${windowType},
          ${windowStart},
          1
        ) ON DUPLICATE KEY UPDATE
          ${aiQuotaWindows.requestCount} = IF(${aiQuotaWindows.requestCount} < ${limit}, ${aiQuotaWindows.requestCount} + 1, ${aiQuotaWindows.requestCount})
      `);
      const header = (Array.isArray(result) ? result[0] : result) as { affectedRows?: number };
      if (header.affectedRows === 0) {
        rejectedWindow = windowType;
        throw new Error("AI_QUOTA_EXCEEDED");
      }
    }
  }).catch((error) => {
    if (rejectedWindow && error instanceof Error && error.message === "AI_QUOTA_EXCEEDED") return;
    throw error;
  });

  const quota = await readAiQuotaStatus(scope, now);
  return { allowed: rejectedWindow === null, rejectedWindow, quota };
}

export async function getAiQuotaStatus(scope: AiQuotaScope, now = new Date()) {
  return readAiQuotaStatus(scope, now);
}

/** Records operational metadata only. A telemetry write must never block AI output. */
export async function recordAiRequestTelemetry(event: AiRequestTelemetry) {
  try {
    const database = await getDb();
    if (!database) return;
    await database.insert(aiRequestEvents).values({
      ...event,
      responseCharacters: event.responseCharacters ?? null,
      durationMs: event.durationMs ?? null,
      failureCode: event.failureCode ?? null,
    });
  } catch {
    // Intentionally ignored: request observability cannot degrade the AI feature.
  }
}

export type CloudSnippetInput = {
  clientId: string;
  title: string;
  code: string;
  language: string;
  description: string;
  tags: string[];
  categoryClientId?: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  copyCount?: number;
  lastCopiedAt?: Date | null;
};

export type CloudSnippetRecord = CloudSnippetInput & {
  revision: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 25);
}

async function getOwnedCategoryId(userId: number, clientId: string | null | undefined) {
  if (!clientId) return null;
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.clientId, clientId), isNull(categories.deletedAt)))
    .limit(1);
  if (!result[0]) throw new Error("Category not found or not owned by the authenticated user");
  return result[0].id;
}

export async function listOwnedSnippets(userId: number): Promise<CloudSnippetRecord[]> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const rows = await db
    .select({
      clientId: snippets.clientId,
      title: snippets.title,
      code: snippets.code,
      language: snippets.language,
      description: snippets.description,
      isFavorite: snippets.isFavorite,
      isPinned: snippets.isPinned,
      copyCount: snippets.copyCount,
      lastCopiedAt: snippets.lastCopiedAt,
      revision: snippets.revision,
      deletedAt: snippets.deletedAt,
      createdAt: snippets.createdAt,
      updatedAt: snippets.updatedAt,
      categoryClientId: categories.clientId,
      snippetId: snippets.id,
    })
    .from(snippets)
    .leftJoin(categories, eq(snippets.categoryId, categories.id))
    .where(and(eq(snippets.userId, userId), isNull(snippets.deletedAt)));

  const snippetIds = rows.map((row) => row.snippetId);
  const tags = snippetIds.length
    ? await db.select().from(snippetTags).where(inArray(snippetTags.snippetId, snippetIds))
    : [];
  const tagsBySnippetId = new Map<number, string[]>();
  for (const tag of tags) {
    tagsBySnippetId.set(tag.snippetId, [...(tagsBySnippetId.get(tag.snippetId) ?? []), tag.tag]);
  }

  return rows.map((row) => ({
    clientId: row.clientId,
    title: row.title,
    code: row.code,
    language: row.language,
    description: row.description,
    tags: tagsBySnippetId.get(row.snippetId) ?? [],
    categoryClientId: row.categoryClientId,
    isFavorite: row.isFavorite,
    isPinned: row.isPinned,
    copyCount: row.copyCount,
    lastCopiedAt: row.lastCopiedAt,
    revision: row.revision,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function upsertOwnedSnippet(userId: number, input: CloudSnippetInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const categoryId = await getOwnedCategoryId(userId, input.categoryClientId);
  const existing = await db
    .select()
    .from(snippets)
    .where(and(eq(snippets.userId, userId), eq(snippets.clientId, input.clientId)))
    .limit(1);
  const now = new Date();
  const tags = normalizeTags(input.tags);

  if (!existing[0]) {
    const inserted = await db.insert(snippets).values({
      userId,
      clientId: input.clientId,
      categoryId,
      title: input.title,
      code: input.code,
      language: input.language,
      description: input.description,
      isFavorite: input.isFavorite,
      isPinned: input.isPinned,
      copyCount: input.copyCount ?? 0,
      lastCopiedAt: input.lastCopiedAt ?? null,
      revision: 1,
    });
    const snippetId = Number(inserted[0].insertId);
    if (tags.length) {
      await db.insert(snippetTags).values(tags.map((tag) => ({ snippetId, tag })));
    }
    return { clientId: input.clientId, revision: 1, created: true };
  }

  const current = existing[0];
  await db.insert(snippetVersions).values({
    snippetId: current.id,
    version: current.revision,
    title: current.title,
    code: current.code,
    language: current.language,
    description: current.description,
    changeDescription: "Cloud sync update",
  });
  const revision = current.revision + 1;
  await db
    .update(snippets)
    .set({
      categoryId,
      title: input.title,
      code: input.code,
      language: input.language,
      description: input.description,
      isFavorite: input.isFavorite,
      isPinned: input.isPinned,
      copyCount: input.copyCount ?? current.copyCount,
      lastCopiedAt: input.lastCopiedAt ?? current.lastCopiedAt,
      revision,
      deletedAt: null,
      updatedAt: now,
    })
    .where(and(eq(snippets.id, current.id), eq(snippets.userId, userId)));
  await db.delete(snippetTags).where(eq(snippetTags.snippetId, current.id));
  if (tags.length) {
    await db.insert(snippetTags).values(tags.map((tag) => ({ snippetId: current.id, tag })));
  }
  return { clientId: input.clientId, revision, created: false };
}

export async function softDeleteOwnedSnippet(userId: number, clientId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db
    .select({ id: snippets.id, revision: snippets.revision })
    .from(snippets)
    .where(and(eq(snippets.userId, userId), eq(snippets.clientId, clientId), isNull(snippets.deletedAt)))
    .limit(1);
  if (!existing[0]) return { deleted: false };

  await db
    .update(snippets)
    .set({ deletedAt: new Date(), revision: existing[0].revision + 1 })
    .where(and(eq(snippets.id, existing[0].id), eq(snippets.userId, userId)));
  return { deleted: true, revision: existing[0].revision + 1 };
}

export type SyncEntityType = "snippet" | "category" | "collection" | "share";
export type SyncOperationType = "upsert" | "delete" | "link" | "unlink";

export type SyncOperationInput = {
  operationId: string;
  entityType: SyncEntityType;
  operationType: SyncOperationType;
  entityClientId: string;
  baseRevision: number;
  payload: unknown;
};

type SyncChangePayload = {
  operationId: string;
  payload: unknown;
};

async function recordSyncChange(
  userId: number,
  entityType: SyncEntityType,
  changeType: SyncOperationType,
  entityClientId: string,
  revision: number,
  payload: SyncChangePayload,
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(syncChanges).values({
    userId,
    entityType,
    changeType,
    entityClientId,
    revision,
    payload,
  });
}

async function getCurrentSnippetRevision(userId: number, clientId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .select({ revision: snippets.revision, deletedAt: snippets.deletedAt })
    .from(snippets)
    .where(and(eq(snippets.userId, userId), eq(snippets.clientId, clientId)))
    .limit(1);
  return result[0] ?? null;
}

async function getCurrentSnippetPayload(userId: number, clientId: string) {
  const records = await listOwnedSnippets(userId);
  return records.find((record) => record.clientId === clientId) ?? null;
}

/**
 * Applies a device operation exactly once. Version mismatches are persisted as
 * conflicts with both payloads available for a later user-facing resolution.
 */
export async function applySyncOperation(userId: number, operation: SyncOperationInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const duplicate = await db
    .select({ id: syncOperations.id })
    .from(syncOperations)
    .where(and(eq(syncOperations.userId, userId), eq(syncOperations.operationId, operation.operationId)))
    .limit(1);
  if (duplicate[0]) {
    return { status: "acknowledged" as const, operationId: operation.operationId, duplicate: true };
  }

  if (operation.entityType !== "snippet") {
    throw new Error(`Sync entity type '${operation.entityType}' is not available yet`);
  }

  const current = await getCurrentSnippetRevision(userId, operation.entityClientId);
  const currentRevision = current?.revision ?? 0;
  if (current && operation.baseRevision !== currentRevision) {
    const serverPayload = await getCurrentSnippetPayload(userId, operation.entityClientId);
    await db.insert(syncConflicts).values({
      userId,
      operationId: operation.operationId,
      entityType: operation.entityType,
      entityClientId: operation.entityClientId,
      baseRevision: operation.baseRevision,
      serverRevision: currentRevision,
      localPayload: operation.payload,
      serverPayload: serverPayload ?? { deletedAt: current.deletedAt },
    });
    return {
      status: "conflict" as const,
      operationId: operation.operationId,
      serverRevision: currentRevision,
      serverPayload,
    };
  }

  let revision = currentRevision;
  if (operation.operationType === "upsert") {
    const payload = operation.payload as CloudSnippetInput;
    if (!payload || payload.clientId !== operation.entityClientId) {
      throw new Error("Sync snippet payload does not match its entity ID");
    }
    const result = await upsertOwnedSnippet(userId, payload);
    revision = result.revision;
  } else if (operation.operationType === "delete") {
    const result = await softDeleteOwnedSnippet(userId, operation.entityClientId);
    revision = result.revision ?? currentRevision;
  } else {
    throw new Error(`Sync operation '${operation.operationType}' is not supported for snippets`);
  }

  await db.insert(syncOperations).values({
    userId,
    operationId: operation.operationId,
    entityType: operation.entityType,
    operationType: operation.operationType,
    entityClientId: operation.entityClientId,
    baseRevision: operation.baseRevision,
    payload: operation.payload,
  });
  await recordSyncChange(
    userId,
    operation.entityType,
    operation.operationType,
    operation.entityClientId,
    revision,
    { operationId: operation.operationId, payload: operation.payload },
  );
  return { status: "acknowledged" as const, operationId: operation.operationId, duplicate: false, revision };
}

export async function pullSyncChanges(userId: number, cursor: number, limit: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select()
    .from(syncChanges)
    .where(and(eq(syncChanges.userId, userId), gt(syncChanges.sequence, cursor)))
    .orderBy(asc(syncChanges.sequence))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const changes = hasMore ? rows.slice(0, limit) : rows;
  return {
    changes,
    nextCursor: changes.at(-1)?.sequence ?? cursor,
    hasMore,
  };
}

export async function listOwnedSyncConflicts(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(syncConflicts)
    .where(and(eq(syncConflicts.userId, userId), eq(syncConflicts.resolution, "unresolved")))
    .orderBy(asc(syncConflicts.createdAt));
}

/**
 * Resolves one stored optimistic-concurrency conflict for its owner. The chosen
 * snapshot is written as a new snippet revision, so neither side disappears
 * merely because a user makes a decision on another device.
 */
export async function resolveOwnedSyncConflict(
  userId: number,
  conflictId: number,
  resolution: "local_wins" | "server_wins",
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const conflict = await db
    .select()
    .from(syncConflicts)
    .where(and(eq(syncConflicts.id, conflictId), eq(syncConflicts.userId, userId), eq(syncConflicts.resolution, "unresolved")))
    .limit(1);
  if (!conflict[0]) throw new Error("Sync conflict not found, not owned by this account, or already resolved");
  if (conflict[0].entityType !== "snippet") throw new Error("Only snippet conflicts can be resolved in this version");

  const chosenPayload = (resolution === "local_wins" ? conflict[0].localPayload : conflict[0].serverPayload) as CloudSnippetInput;
  if (!chosenPayload || chosenPayload.clientId !== conflict[0].entityClientId) {
    throw new Error("The selected conflict snapshot is invalid");
  }

  const result = await upsertOwnedSnippet(userId, {
    ...chosenPayload,
    lastCopiedAt: chosenPayload.lastCopiedAt ? new Date(chosenPayload.lastCopiedAt) : null,
  });
  await db
    .update(syncConflicts)
    .set({ resolution, resolvedAt: new Date() })
    .where(and(eq(syncConflicts.id, conflictId), eq(syncConflicts.userId, userId), eq(syncConflicts.resolution, "unresolved")));
  await recordSyncChange(userId, "snippet", "upsert", chosenPayload.clientId, result.revision, {
    operationId: `conflict:${conflictId}:${resolution}`,
    payload: chosenPayload,
  });

  return { conflictId, resolution, clientId: chosenPayload.clientId, revision: result.revision };
}

function createShareToken() {
  return randomBytes(24).toString("base64url");
}

export type ShareOptions = {
  maxViews?: number | null;
  expiresAt?: Date | null;
};

export async function createOwnedShare(userId: number, snippetClientId: string, options: ShareOptions) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const snippet = await db
    .select({ id: snippets.id })
    .from(snippets)
    .where(and(eq(snippets.userId, userId), eq(snippets.clientId, snippetClientId), isNull(snippets.deletedAt)))
    .limit(1);
  if (!snippet[0]) throw new Error("Snippet not found or not owned by the authenticated user");

  const snapshot = await getCurrentSnippetPayload(userId, snippetClientId);
  if (!snapshot) throw new Error("Snippet snapshot could not be created");
  const token = createShareToken();
  await db.insert(shares).values({
    userId,
    snippetId: snippet[0].id,
    token,
    snapshot,
    maxViews: options.maxViews ?? null,
    expiresAt: options.expiresAt ?? null,
  });
  return { token, snapshot, maxViews: options.maxViews ?? null, expiresAt: options.expiresAt ?? null };
}

export async function listOwnedShares(userId: number, snippetClientId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const conditions = [eq(shares.userId, userId)];
  if (snippetClientId) conditions.push(eq(snippets.clientId, snippetClientId));
  return db
    .select({
      token: shares.token,
      snippetClientId: snippets.clientId,
      viewCount: shares.viewCount,
      maxViews: shares.maxViews,
      expiresAt: shares.expiresAt,
      revokedAt: shares.revokedAt,
      createdAt: shares.createdAt,
    })
    .from(shares)
    .innerJoin(snippets, eq(shares.snippetId, snippets.id))
    .where(and(...conditions))
    .orderBy(asc(shares.createdAt));
}

export async function revokeOwnedShare(userId: number, token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .update(shares)
    .set({ revokedAt: new Date() })
    .where(and(eq(shares.userId, userId), eq(shares.token, token), isNull(shares.revokedAt)));
  return { revoked: result[0].affectedRows > 0 };
}

/**
 * Returns a frozen public snapshot rather than the live private snippet.
 * The conditional increment makes revoked, expired, and exhausted shares fail closed.
 */
export async function getPublicShare(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const now = new Date();
  const validCondition = and(
    eq(shares.token, token),
    isNull(shares.revokedAt),
    or(isNull(shares.expiresAt), gt(shares.expiresAt, now)),
    or(isNull(shares.maxViews), gt(shares.maxViews, shares.viewCount)),
  );
  const incremented = await db
    .update(shares)
    .set({ viewCount: sql`${shares.viewCount} + 1` })
    .where(validCondition);
  if (incremented[0].affectedRows === 0) return null;

  const result = await db
    .select({
      snapshot: shares.snapshot,
      viewCount: shares.viewCount,
      maxViews: shares.maxViews,
      expiresAt: shares.expiresAt,
    })
    .from(shares)
    .where(eq(shares.token, token))
    .limit(1);
  return result[0] ?? null;
}

export type CloudCategoryInput = {
  clientId: string;
  name: string;
  parentClientId?: string | null;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
};

export type CloudCollectionInput = {
  clientId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  isPublic?: boolean;
};

export async function listOwnedCategories(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), isNull(categories.deletedAt)))
    .orderBy(asc(categories.name));
  const clientIdById = new Map(rows.map((row) => [row.id, row.clientId]));
  return rows.map((row) => ({
    clientId: row.clientId,
    name: row.name,
    parentClientId: row.parentId ? clientIdById.get(row.parentId) ?? null : null,
    icon: row.icon,
    color: row.color,
    description: row.description,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function upsertOwnedCategory(userId: number, input: CloudCategoryInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (input.parentClientId === input.clientId) throw new Error("A category cannot be its own parent");
  const parentId = await getOwnedCategoryId(userId, input.parentClientId);
  const existing = await db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.clientId, input.clientId)))
    .limit(1);
  if (!existing[0]) {
    await db.insert(categories).values({
      userId,
      clientId: input.clientId,
      parentId,
      name: input.name,
      icon: input.icon ?? null,
      color: input.color ?? null,
      description: input.description ?? null,
      revision: 1,
    });
    return { clientId: input.clientId, revision: 1, created: true };
  }
  const revision = existing[0].revision + 1;
  await db
    .update(categories)
    .set({
      parentId,
      name: input.name,
      icon: input.icon ?? null,
      color: input.color ?? null,
      description: input.description ?? null,
      deletedAt: null,
      revision,
    })
    .where(and(eq(categories.id, existing[0].id), eq(categories.userId, userId)));
  return { clientId: input.clientId, revision, created: false };
}

export async function softDeleteOwnedCategory(userId: number, clientId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db
    .select({ id: categories.id, revision: categories.revision })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.clientId, clientId), isNull(categories.deletedAt)))
    .limit(1);
  if (!existing[0]) return { deleted: false };
  await db
    .update(categories)
    .set({ deletedAt: new Date(), revision: existing[0].revision + 1 })
    .where(and(eq(categories.id, existing[0].id), eq(categories.userId, userId)));
  return { deleted: true, revision: existing[0].revision + 1 };
}

export async function listOwnedCollections(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(collections)
    .where(and(eq(collections.userId, userId), isNull(collections.deletedAt)))
    .orderBy(asc(collections.name));
}

export async function upsertOwnedCollection(userId: number, input: CloudCollectionInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db
    .select()
    .from(collections)
    .where(and(eq(collections.userId, userId), eq(collections.clientId, input.clientId)))
    .limit(1);
  if (!existing[0]) {
    await db.insert(collections).values({
      userId,
      clientId: input.clientId,
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      isPublic: input.isPublic ?? false,
      revision: 1,
    });
    return { clientId: input.clientId, revision: 1, created: true };
  }
  const revision = existing[0].revision + 1;
  await db
    .update(collections)
    .set({
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      isPublic: input.isPublic ?? false,
      deletedAt: null,
      revision,
    })
    .where(and(eq(collections.id, existing[0].id), eq(collections.userId, userId)));
  return { clientId: input.clientId, revision, created: false };
}

export async function softDeleteOwnedCollection(userId: number, clientId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db
    .select({ id: collections.id, revision: collections.revision })
    .from(collections)
    .where(and(eq(collections.userId, userId), eq(collections.clientId, clientId), isNull(collections.deletedAt)))
    .limit(1);
  if (!existing[0]) return { deleted: false };
  await db
    .update(collections)
    .set({ deletedAt: new Date(), revision: existing[0].revision + 1 })
    .where(and(eq(collections.id, existing[0].id), eq(collections.userId, userId)));
  return { deleted: true, revision: existing[0].revision + 1 };
}
