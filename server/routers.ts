import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().trim().min(1).max(12_000),
});

const aiRequestWindows = new Map<string, { count: number; resetAt: number }>();
const AI_REQUEST_LIMIT = 24;
const AI_REQUEST_WINDOW_MS = 60 * 60 * 1000;

function enforceAiRateLimit(clientKey: string) {
  const now = Date.now();
  const existing = aiRequestWindows.get(clientKey);
  const window = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + AI_REQUEST_WINDOW_MS } : existing;
  if (window.count >= AI_REQUEST_LIMIT) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "AI request limit reached. Try again after the current hour window resets.",
    });
  }
  window.count += 1;
  aiRequestWindows.set(clientKey, window);
}

async function runAi(messages: Array<z.infer<typeof messageSchema>>, clientKey: string) {
  enforceAiRateLimit(clientKey);
  const response = await invokeLLM({ messages });
  return response.choices[0]?.message?.content || "";
}

const cloudSnippetSchema = z.object({
  clientId: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(255),
  code: z.string().min(1).max(500_000),
  language: z.string().trim().min(1).max(80),
  description: z.string().max(20_000).default(""),
  tags: z.array(z.string().trim().min(1).max(80)).max(25).default([]),
  categoryClientId: z.string().trim().min(1).max(64).nullable().optional(),
  isFavorite: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  copyCount: z.number().int().min(0).max(1_000_000).optional(),
  lastCopiedAt: z.number().int().positive().nullable().optional(),
});

const syncOperationSchema = z.object({
  operationId: z.string().uuid(),
  entityType: z.enum(["snippet", "category", "collection", "share"]),
  operationType: z.enum(["upsert", "delete", "link", "unlink"]),
  entityClientId: z.string().trim().min(1).max(64),
  baseRevision: z.number().int().min(0).max(2_000_000_000),
  payload: z.unknown(),
});

const shareOptionsSchema = z.object({
  snippetClientId: z.string().trim().min(1).max(64),
  maxViews: z.number().int().min(1).max(1_000_000).nullable().optional(),
  expiresAt: z.number().int().positive().nullable().optional(),
});

const cloudCategorySchema = z.object({
  clientId: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  parentClientId: z.string().trim().min(1).max(64).nullable().optional(),
  icon: z.string().trim().min(1).max(64).nullable().optional(),
  color: z.string().trim().min(1).max(16).nullable().optional(),
  description: z.string().max(10_000).nullable().optional(),
});

const cloudCollectionSchema = z.object({
  clientId: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(10_000).nullable().optional(),
  color: z.string().trim().min(1).max(16).nullable().optional(),
  isPublic: z.boolean().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  snippets: router({
    /** Returns only the authenticated user's non-deleted cloud snapshot. */
    list: protectedProcedure.query(({ ctx }) => db.listOwnedSnippets(ctx.user.id)),

    /** Idempotent by `(userId, clientId)`; the server owns revisions and timestamps. */
    upsert: protectedProcedure.input(cloudSnippetSchema).mutation(async ({ ctx, input }) => {
      return db.upsertOwnedSnippet(ctx.user.id, {
        ...input,
        lastCopiedAt: input.lastCopiedAt ? new Date(input.lastCopiedAt) : null,
      });
    }),

    /** Soft deletion prevents stale offline clients from silently resurrecting a record. */
    remove: protectedProcedure
      .input(z.object({ clientId: z.string().trim().min(1).max(64) }))
      .mutation(({ ctx, input }) => db.softDeleteOwnedSnippet(ctx.user.id, input.clientId)),
  }),

  categories: router({
    list: protectedProcedure.query(({ ctx }) => db.listOwnedCategories(ctx.user.id)),
    upsert: protectedProcedure
      .input(cloudCategorySchema)
      .mutation(({ ctx, input }) => db.upsertOwnedCategory(ctx.user.id, input)),
    remove: protectedProcedure
      .input(z.object({ clientId: z.string().trim().min(1).max(64) }))
      .mutation(({ ctx, input }) => db.softDeleteOwnedCategory(ctx.user.id, input.clientId)),
  }),

  collections: router({
    list: protectedProcedure.query(({ ctx }) => db.listOwnedCollections(ctx.user.id)),
    upsert: protectedProcedure
      .input(cloudCollectionSchema)
      .mutation(({ ctx, input }) => db.upsertOwnedCollection(ctx.user.id, input)),
    remove: protectedProcedure
      .input(z.object({ clientId: z.string().trim().min(1).max(64) }))
      .mutation(({ ctx, input }) => db.softDeleteOwnedCollection(ctx.user.id, input.clientId)),
  }),

  sync: router({
    /**
     * Processes device operations in order. Every operation has an immutable ID,
     * so client retries are acknowledged without replaying writes.
     */
    push: protectedProcedure
      .input(z.object({ operations: z.array(syncOperationSchema).min(1).max(50) }))
      .mutation(async ({ ctx, input }) => {
        const results = [];
        for (const operation of input.operations) {
          const payload =
            operation.entityType === "snippet" && operation.operationType === "upsert"
              ? cloudSnippetSchema.parse(operation.payload)
              : operation.payload;
          results.push(
            await db.applySyncOperation(ctx.user.id, {
              ...operation,
              payload,
            }),
          );
        }
        return { results };
      }),

    /** Pulls a bounded, monotonic slice of this user's change log. */
    pull: protectedProcedure
      .input(z.object({ cursor: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(100).default(50) }))
      .query(({ ctx, input }) => db.pullSyncChanges(ctx.user.id, input.cursor, input.limit)),

    /** Exposes unresolved conflicts for a future user-facing resolution screen. */
    conflicts: protectedProcedure.query(({ ctx }) => db.listOwnedSyncConflicts(ctx.user.id)),
  }),

  shares: router({
    create: protectedProcedure.input(shareOptionsSchema).mutation(async ({ ctx, input }) => {
      if (input.expiresAt && input.expiresAt <= Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A share expiry must be in the future." });
      }
      return db.createOwnedShare(ctx.user.id, input.snippetClientId, {
        maxViews: input.maxViews,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      });
    }),

    list: protectedProcedure
      .input(z.object({ snippetClientId: z.string().trim().min(1).max(64).optional() }).optional())
      .query(({ ctx, input }) => db.listOwnedShares(ctx.user.id, input?.snippetClientId)),

    revoke: protectedProcedure
      .input(z.object({ token: z.string().trim().min(32).max(96) }))
      .mutation(({ ctx, input }) => db.revokeOwnedShare(ctx.user.id, input.token)),

    /** A public consumer sees only the frozen snapshot, never the owner or live private data. */
    resolve: publicProcedure
      .input(z.object({ token: z.string().trim().min(32).max(96) }))
      .query(async ({ input }) => {
        const share = await db.getPublicShare(input.token);
        if (!share) throw new TRPCError({ code: "NOT_FOUND", message: "This share is unavailable or has expired." });
        return share;
      }),
  }),

  // Public by design; prompts are bounded and rate-limited until account quotas are introduced.
  ai: router({
    generate: publicProcedure
      .input(z.object({ messages: z.array(messageSchema).min(1).max(20) }))
      .mutation(({ ctx, input }) => runAi(input.messages, ctx.req.ip ?? "unknown")),

    explain: publicProcedure
      .input(z.object({ messages: z.array(messageSchema).min(1).max(20) }))
      .mutation(({ ctx, input }) => runAi(input.messages, ctx.req.ip ?? "unknown")),

    convert: publicProcedure
      .input(z.object({ messages: z.array(messageSchema).min(1).max(20) }))
      .mutation(({ ctx, input }) => runAi(input.messages, ctx.req.ip ?? "unknown")),

    generateRelated: publicProcedure
      .input(z.object({ messages: z.array(messageSchema).min(1).max(20) }))
      .mutation(({ ctx, input }) => runAi(input.messages, ctx.req.ip ?? "unknown")),
  }),
});

export type AppRouter = typeof appRouter;
