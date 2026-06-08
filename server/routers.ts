import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // AI-powered snippet operations
  ai: router({
    generate: publicProcedure
      .input(
        z.object({
          messages: z.array(messageSchema),
        })
      )
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: input.messages,
        });
        return response.choices[0]?.message?.content || "";
      }),

    explain: publicProcedure
      .input(
        z.object({
          messages: z.array(messageSchema),
        })
      )
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: input.messages,
        });
        return response.choices[0]?.message?.content || "";
      }),

    convert: publicProcedure
      .input(
        z.object({
          messages: z.array(messageSchema),
        })
      )
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: input.messages,
        });
        return response.choices[0]?.message?.content || "";
      }),

    generateRelated: publicProcedure
      .input(
        z.object({
          messages: z.array(messageSchema),
        })
      )
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: input.messages,
        });
        return response.choices[0]?.message?.content || "";
      }),
  }),
});

export type AppRouter = typeof appRouter;
