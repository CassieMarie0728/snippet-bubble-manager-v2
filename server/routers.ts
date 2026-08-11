import { z } from "zod";
import { createHmac } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import * as db from "./db";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().trim().min(1).max(12_000),
});

type AiProcedure = "generate" | "explain" | "convert" | "generateRelated";

function getAiScope(ctx: {
  user: { id: number } | null;
  req: { ip?: string; socket?: { remoteAddress?: string | null } };
}): db.AiQuotaScope {
  const scopeType = ctx.user ? "account" : "anonymous";
  const identity = ctx.user ? String(ctx.user.id) : ctx.req.ip || ctx.req.socket?.remoteAddress || "unknown";
  const secret = ENV.cookieSecret || ENV.forgeApiKey || "snippet-bubbles-ai-quota-v1";
  const scopeHash = createHmac("sha256", secret).update(`${scopeType}:${identity}`).digest("hex");
  return { userId: ctx.user?.id ?? null, scopeType, scopeHash };
}

function getCurrentHourStart(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours()));
}

function getRetryMessage(quota: db.AiQuotaStatus, rejectedWindow: "hour" | "day" | null) {
  const window = rejectedWindow === "day" ? quota.daily : quota.hourly;
  const label = rejectedWindow === "day" ? "daily" : "hourly";
  return `AI ${label} request limit reached. Try again after ${window.resetsAt.toISOString()}.`;
}

async function runAi({
  procedure,
  messages,
  scope,
}: {
  procedure: AiProcedure;
  messages: Array<z.infer<typeof messageSchema>>;
  scope: db.AiQuotaScope;
}) {
  const startedAt = Date.now();
  const requestedAt = new Date(startedAt);
  const promptCharacters = messages.reduce((total, message) => total + message.content.length, 0);
  const quotaReservation = await db.reserveAiQuota(scope, requestedAt);

  if (!quotaReservation.allowed) {
    await db.recordAiRequestTelemetry({
      ...scope,
      procedure,
      outcome: "rejected",
      promptCharacters,
      messageCount: messages.length,
      quotaWindowStart: getCurrentHourStart(requestedAt),
      failureCode: quotaReservation.rejectedWindow === "day" ? "DAILY_QUOTA_EXCEEDED" : "HOURLY_QUOTA_EXCEEDED",
    });
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: getRetryMessage(quotaReservation.quota, quotaReservation.rejectedWindow),
    });
  }

  try {
    const response = await invokeLLM({ messages });
    const content = response.choices[0]?.message?.content || "";
    await db.recordAiRequestTelemetry({
      ...scope,
      procedure,
      outcome: "succeeded",
      promptCharacters,
      messageCount: messages.length,
      responseCharacters: content.length,
      durationMs: Math.min(Date.now() - startedAt, 3_600_000),
      quotaWindowStart: getCurrentHourStart(requestedAt),
    });
    return content;
  } catch (error) {
    await db.recordAiRequestTelemetry({
      ...scope,
      procedure,
      outcome: "failed",
      promptCharacters,
      messageCount: messages.length,
      durationMs: Math.min(Date.now() - startedAt, 3_600_000),
      quotaWindowStart: getCurrentHourStart(requestedAt),
      failureCode: error instanceof TRPCError ? error.code : "PROVIDER_ERROR",
    });
    throw error;
  }
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

    /** Applies an explicit owner decision; no timestamp heuristic silently chooses a side. */
    resolve: protectedProcedure
      .input(
        z.object({
          conflictId: z.number().int().positive(),
          resolution: z.enum(["local_wins", "server_wins"]),
        }),
      )
      .mutation(({ ctx, input }) => db.resolveOwnedSyncConflict(ctx.user.id, input.conflictId, input.resolution)),
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

  // AI prompts are bounded; quotas and telemetry are durable and content-free.
  ai: router({
    quota: publicProcedure.query(({ ctx }) => db.getAiQuotaStatus(getAiScope(ctx))),

    generate: publicProcedure
      .input(z.object({ messages: z.array(messageSchema).min(1).max(20) }))
      .mutation(({ ctx, input }) => runAi({ procedure: "generate", messages: input.messages, scope: getAiScope(ctx) })),

    explain: publicProcedure
      .input(z.object({ messages: z.array(messageSchema).min(1).max(20) }))
      .mutation(({ ctx, input }) => runAi({ procedure: "explain", messages: input.messages, scope: getAiScope(ctx) })),

    convert: publicProcedure
      .input(z.object({ messages: z.array(messageSchema).min(1).max(20) }))
      .mutation(({ ctx, input }) => runAi({ procedure: "convert", messages: input.messages, scope: getAiScope(ctx) })),

    generateRelated: publicProcedure
      .input(z.object({ messages: z.array(messageSchema).min(1).max(20) }))
      .mutation(({ ctx, input }) => runAi({ procedure: "generateRelated", messages: input.messages, scope: getAiScope(ctx) })),
  }),
});

export type AppRouter = typeof appRouter;
