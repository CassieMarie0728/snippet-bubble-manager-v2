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
