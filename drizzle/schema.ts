import {
  boolean,
  type AnyMySqlColumn,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Cloud-sync domain tables use stable client IDs so an offline device can create
 * records before it has a database connection. Numeric IDs are internal only.
 */
export const categories = mysqlTable(
  "categories",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    clientId: varchar("clientId", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    parentId: int("parentId").references((): AnyMySqlColumn => categories.id, { onDelete: "set null" }),
    icon: varchar("icon", { length: 64 }),
    color: varchar("color", { length: 16 }),
    description: text("description"),
    revision: int("revision").default(1).notNull(),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("categories_user_client_unique").on(table.userId, table.clientId),
    index("categories_user_updated_idx").on(table.userId, table.updatedAt),
    index("categories_parent_idx").on(table.parentId),
  ],
);

export const snippets = mysqlTable(
  "snippets",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    clientId: varchar("clientId", { length: 64 }).notNull(),
    categoryId: int("categoryId").references(() => categories.id, { onDelete: "set null" }),
    title: varchar("title", { length: 255 }).notNull(),
    code: text("code").notNull(),
    language: varchar("language", { length: 80 }).notNull(),
    description: text("description").notNull(),
    isFavorite: boolean("isFavorite").default(false).notNull(),
    isPinned: boolean("isPinned").default(false).notNull(),
    lastCopiedAt: timestamp("lastCopiedAt"),
    copyCount: int("copyCount").default(0).notNull(),
    revision: int("revision").default(1).notNull(),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("snippets_user_client_unique").on(table.userId, table.clientId),
    index("snippets_user_updated_idx").on(table.userId, table.updatedAt),
    index("snippets_user_deleted_idx").on(table.userId, table.deletedAt),
    index("snippets_category_idx").on(table.categoryId),
  ],
);

export const snippetTags = mysqlTable(
  "snippetTags",
  {
    id: int("id").autoincrement().primaryKey(),
    snippetId: int("snippetId").notNull().references(() => snippets.id, { onDelete: "cascade" }),
    tag: varchar("tag", { length: 80 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("snippet_tags_unique").on(table.snippetId, table.tag),
    index("snippet_tags_tag_idx").on(table.tag),
  ],
);

export const snippetVersions = mysqlTable(
  "snippetVersions",
  {
    id: int("id").autoincrement().primaryKey(),
    snippetId: int("snippetId").notNull().references(() => snippets.id, { onDelete: "cascade" }),
    version: int("version").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    code: text("code").notNull(),
    language: varchar("language", { length: 80 }).notNull(),
    description: text("description").notNull(),
    changeDescription: varchar("changeDescription", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("snippet_versions_unique").on(table.snippetId, table.version),
    index("snippet_versions_created_idx").on(table.snippetId, table.createdAt),
  ],
);

export const collections = mysqlTable(
  "collections",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    clientId: varchar("clientId", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 16 }),
    isPublic: boolean("isPublic").default(false).notNull(),
    revision: int("revision").default(1).notNull(),
    deletedAt: timestamp("deletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("collections_user_client_unique").on(table.userId, table.clientId),
    index("collections_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export const collectionSnippets = mysqlTable(
  "collectionSnippets",
  {
    id: int("id").autoincrement().primaryKey(),
    collectionId: int("collectionId").notNull().references(() => collections.id, { onDelete: "cascade" }),
    snippetId: int("snippetId").notNull().references(() => snippets.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("collection_snippets_unique").on(table.collectionId, table.snippetId),
    index("collection_snippets_snippet_idx").on(table.snippetId),
  ],
);

export const shares = mysqlTable(
  "shares",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    snippetId: int("snippetId").notNull().references(() => snippets.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 96 }).notNull(),
    snapshot: json("snapshot").notNull(),
    viewCount: int("viewCount").default(0).notNull(),
    maxViews: int("maxViews"),
    expiresAt: timestamp("expiresAt"),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("shares_token_unique").on(table.token),
    index("shares_snippet_status_idx").on(table.snippetId, table.revokedAt, table.expiresAt),
  ],
);

export const syncOperations = mysqlTable(
  "syncOperations",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    operationId: varchar("operationId", { length: 64 }).notNull(),
    entityType: mysqlEnum("entityType", ["snippet", "category", "collection", "share"]).notNull(),
    operationType: mysqlEnum("operationType", ["upsert", "delete", "link", "unlink"]).notNull(),
    entityClientId: varchar("entityClientId", { length: 64 }).notNull(),
    baseRevision: int("baseRevision").default(0).notNull(),
    payload: json("payload").notNull(),
    processedAt: timestamp("processedAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sync_operations_user_operation_unique").on(table.userId, table.operationId),
    index("sync_operations_user_entity_idx").on(table.userId, table.entityType, table.entityClientId),
  ],
);

export const syncChanges = mysqlTable(
  "syncChanges",
  {
    sequence: int("sequence").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    entityType: mysqlEnum("entityType", ["snippet", "category", "collection", "share"]).notNull(),
    changeType: mysqlEnum("changeType", ["upsert", "delete", "link", "unlink"]).notNull(),
    entityClientId: varchar("entityClientId", { length: 64 }).notNull(),
    revision: int("revision").notNull(),
    payload: json("payload").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("sync_changes_user_sequence_idx").on(table.userId, table.sequence),
  ],
);

/**
 * Stores both sides of an optimistic-concurrency conflict. The server never
 * discards a client edit merely because another device wrote first.
 */
export const syncConflicts = mysqlTable(
  "syncConflicts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    operationId: varchar("operationId", { length: 64 }).notNull(),
    entityType: mysqlEnum("entityType", ["snippet", "category", "collection", "share"]).notNull(),
    entityClientId: varchar("entityClientId", { length: 64 }).notNull(),
    baseRevision: int("baseRevision").notNull(),
    serverRevision: int("serverRevision").notNull(),
    localPayload: json("localPayload").notNull(),
    serverPayload: json("serverPayload").notNull(),
    resolution: mysqlEnum("resolution", ["unresolved", "server_wins", "local_wins"])
      .default("unresolved")
      .notNull(),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("sync_conflicts_user_operation_unique").on(table.userId, table.operationId),
    index("sync_conflicts_user_resolution_idx").on(table.userId, table.resolution, table.createdAt),
  ],
);

export type Category = typeof categories.$inferSelect;
export type Snippet = typeof snippets.$inferSelect;
export type SnippetVersion = typeof snippetVersions.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Share = typeof shares.$inferSelect;
export type SyncOperation = typeof syncOperations.$inferSelect;
export type SyncChange = typeof syncChanges.$inferSelect;
export type SyncConflict = typeof syncConflicts.$inferSelect;
