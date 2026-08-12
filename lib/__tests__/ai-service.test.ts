import { beforeEach, describe, expect, it, vi } from "vitest";

const trpcMocks = vi.hoisted(() => ({
  generate: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  createTRPCClient: () => ({
    ai: {
      generate: { mutate: trpcMocks.generate },
    },
  }),
}));

import { generateSnippet } from "../ai-service";

describe("AI generation language handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trpcMocks.generate.mockResolvedValue(
      JSON.stringify({
        code: "console.log('ok')",
        language: "JavaScript",
        explanation: "A test snippet.",
        tags: ["test"],
      }),
    );
  });

  it("allows generation without a selected language", async () => {
    await expect(generateSnippet({ prompt: "print a greeting" })).resolves.toMatchObject({
      code: "console.log('ok')",
    });
    expect(trpcMocks.generate).toHaveBeenCalledWith({
      messages: [
        expect.objectContaining({ role: "system" }),
        expect.objectContaining({
          role: "user",
          content: expect.not.stringContaining(" in undefined"),
        }),
      ],
    });
  });

  it("passes an arbitrary custom language to the model prompt", async () => {
    await generateSnippet({ prompt: "define a route", language: "Solidity" });
    expect(trpcMocks.generate).toHaveBeenCalledWith({
      messages: [
        expect.objectContaining({ role: "system" }),
        expect.objectContaining({ role: "user", content: expect.stringContaining(" in Solidity") }),
      ],
    });
  });
});
