import { describe, expect, it, vi } from "vitest";
import { notifyAuthChanged, subscribeToAuthChanges } from "../auth-events";

describe("auth change notifications", () => {
  it("notifies active listeners and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAuthChanges(listener);

    notifyAuthChanged();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    notifyAuthChanged();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
