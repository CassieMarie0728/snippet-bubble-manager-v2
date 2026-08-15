import { beforeEach, describe, expect, it, vi } from "vitest";

const { openAuthSessionAsync, openBrowserAsync, openURL } = vi.hoisted(() => ({
  openAuthSessionAsync: vi.fn(),
  openBrowserAsync: vi.fn(),
  openURL: vi.fn(),
}));

vi.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        apiBaseUrl: "https://snippetmgr.example",
      },
    },
  },
}));

vi.mock("expo-linking", () => ({
  createURL: vi.fn(() => "manus20260327210406://oauth/callback"),
  openURL,
}));

vi.mock("expo-web-browser", () => ({
  openAuthSessionAsync,
  openBrowserAsync,
}));

import { startOAuthLogin } from "../oauth";

describe("native OAuth fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ url: "https://auth.example/app-auth" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
  });

  it("opens the login URL in the system browser when auth-session launch fails", async () => {
    openAuthSessionAsync.mockRejectedValueOnce(new Error("secure session unavailable"));

    await expect(startOAuthLogin()).resolves.toBe("opened");
    expect(openBrowserAsync).toHaveBeenCalledWith("https://auth.example/app-auth");
    expect(openURL).not.toHaveBeenCalled();
  });
});
