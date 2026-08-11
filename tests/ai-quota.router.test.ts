import { describe, expect, it, vi, beforeEach } from "vitest";

const dbMocks = vi.hoisted(() => ({
  reserveAiQuota: vi.fn(),
  getAiQuotaStatus: vi.fn(),
  recordAiRequestTelemetry: vi.fn(),
}));

const llmMocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
}));

vi.mock("../server/db", () => dbMocks);
vi.mock("../server/_core/llm", () => llmMocks);

import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

const quota = {
  hourly: { limit: 24, used: 1, remaining: 23, resetsAt: new Date("2026-08-11T19:00:00.000Z") },
  daily: { limit: 200, used: 1, remaining: 199, resetsAt: new Date("2026-08-12T00:00:00.000Z") },
};

function createContext(authenticated = false): TrpcContext {
  return {
    user: authenticated
      ? {
          id: 73,
          openId: "quota-owner",
          email: "owner@example.com",
          name: "Quota Owner",
          loginMethod: "manus",
          role: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { protocol: "https", headers: {}, ip: "198.51.100.42" } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const messages = [
  { role: "system" as const, content: "Be precise." },
  { role: "user" as const, content: "Explain this non-secret code snippet." },
];

describe("AI quota router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.reserveAiQuota.mockResolvedValue({ allowed: true, rejectedWindow: null, quota });
    dbMocks.getAiQuotaStatus.mockResolvedValue(quota);
    dbMocks.recordAiRequestTelemetry.mockResolvedValue(undefined);
    llmMocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "A concise answer." } }] });
  });

  it("uses a hashed anonymous scope, reserves durable quota, and records no prompt content", async () => {
    const caller = appRouter.createCaller(createContext(false));

    await expect(caller.ai.explain({ messages })).resolves.toBe("A concise answer.");

    const scope = dbMocks.reserveAiQuota.mock.calls[0][0];
    expect(scope).toMatchObject({ userId: null, scopeType: "anonymous" });
    expect(scope.scopeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(scope.scopeHash).not.toContain("198.51.100.42");

    const telemetry = dbMocks.recordAiRequestTelemetry.mock.calls[0][0];
    expect(telemetry).toMatchObject({
      outcome: "succeeded",
      procedure: "explain",
      messageCount: 2,
      promptCharacters: messages[0].content.length + messages[1].content.length,
      responseCharacters: "A concise answer.".length,
    });
    expect(telemetry).not.toHaveProperty("messages");
    expect(telemetry).not.toHaveProperty("prompt");
    expect(telemetry).not.toHaveProperty("content");
  });

  it("enforces a durable hourly quota and records the rejection without calling the model", async () => {
    dbMocks.reserveAiQuota.mockResolvedValueOnce({ allowed: false, rejectedWindow: "hour", quota });
    const caller = appRouter.createCaller(createContext(true));

    await expect(caller.ai.generate({ messages })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(llmMocks.invokeLLM).not.toHaveBeenCalled();
    expect(dbMocks.recordAiRequestTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 73,
        scopeType: "account",
        procedure: "generate",
        outcome: "rejected",
        failureCode: "HOURLY_QUOTA_EXCEEDED",
      }),
    );
  });

  it("records provider failures as metadata only", async () => {
    llmMocks.invokeLLM.mockRejectedValueOnce(new Error("provider unavailable"));
    const caller = appRouter.createCaller(createContext(true));

    await expect(caller.ai.convert({ messages })).rejects.toThrow("provider unavailable");
    expect(dbMocks.recordAiRequestTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failed", procedure: "convert", failureCode: "PROVIDER_ERROR" }),
    );
  });

  it("returns compact quota status for the current requester without exposing telemetry", async () => {
    const caller = appRouter.createCaller(createContext(true));

    await expect(caller.ai.quota()).resolves.toEqual(quota);
    expect(dbMocks.getAiQuotaStatus).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 73, scopeType: "account", scopeHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
    );
  });
});
