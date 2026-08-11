import { and, eq, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  categories,
  InsertUser,
  snippets,
  snippetTags,
  snippetVersions,
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
