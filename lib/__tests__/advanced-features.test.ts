import { describe, it, expect, beforeEach } from "vitest";
import type { Snippet, SnippetVersion, ShareableSnippet } from "../types";
import {
  createSnippetVersion,
  getSnippetVersions,
  revertToVersion,
  calculateVersionDiff,
  getVersionStats,
} from "../snippet-versioning";
import {
  createShareableSnippet,
  generateShareUrl,
  generateQRCodeUrl,
  isShareableValid,
  incrementShareableViews,
  createTimeLimitedShare,
  createViewLimitedShare,
  getShareExpirationInfo,
  formatShareExpiration,
  getActiveShares,
  revokeShare,
} from "../snippet-sharing";

describe("Advanced Features", () => {
  let testSnippet: Snippet;

  beforeEach(() => {
    testSnippet = {
      id: "snippet_1",
      title: "Test Snippet",
      code: "console.log('hello');",
      language: "JavaScript",
      description: "A test snippet",
      tags: ["test"],
      isFavorite: false,
      isPinned: false,
      lastCopiedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  describe("Snippet Versioning", () => {
    it("should create a snippet version", () => {
      const version = createSnippetVersion(testSnippet, "Initial version");
      expect(version.snippetId).toBe("snippet_1");
      expect(version.code).toBe("console.log('hello');");
      expect(version.changeDescription).toBe("Initial version");
    });

    it("should get all versions for a snippet", () => {
      const v1 = createSnippetVersion(testSnippet, "v1");
      const v2 = createSnippetVersion(testSnippet, "v2");
      const allVersions = [v1, v2];

      const versions = getSnippetVersions(allVersions, "snippet_1");
      expect(versions.length).toBe(2);
      expect(versions[0].snippetId).toBe("snippet_1");
      expect(versions[1].snippetId).toBe("snippet_1");
    });

    it("should revert to a previous version", () => {
      const oldVersion = createSnippetVersion(testSnippet, "old");
      const newSnippet = { ...testSnippet, code: "console.log('new');" };

      const reverted = revertToVersion(newSnippet, oldVersion);
      expect(reverted.code).toBe(oldVersion.code);
    });

    it("should calculate version diff", () => {
      const oldCode = "line 1\nline 2\nline 3";
      const newCode = "line 1\nmodified\nline 3\nline 4";

      const diff = calculateVersionDiff(oldCode, newCode);
      expect(diff.added).toBeGreaterThanOrEqual(0);
      expect(diff.removed).toBeGreaterThanOrEqual(0);
      expect(diff.changed).toBeGreaterThanOrEqual(0);
    });

    it("should get version statistics", () => {
      const v1 = createSnippetVersion(testSnippet, "v1");
      const v2 = createSnippetVersion(testSnippet, "v2");
      const allVersions = [v1, v2];

      const stats = getVersionStats(allVersions, "snippet_1");
      expect(stats.totalVersions).toBe(2);
      expect(stats.oldestVersion).toBeDefined();
      expect(stats.newestVersion).toBeDefined();
    });
  });

  describe("Snippet Sharing", () => {
    it("should create a shareable snippet", () => {
      const shareable = createShareableSnippet(testSnippet);
      expect(shareable.snippetId).toBe("snippet_1");
      expect(shareable.shareToken).toBeTruthy();
      expect(shareable.isPublic).toBe(true);
      expect(shareable.viewCount).toBe(0);
    });

    it("should generate share URL", () => {
      const shareable = createShareableSnippet(testSnippet);
      const url = generateShareUrl(shareable.shareToken);
      expect(url).toContain(shareable.shareToken);
      expect(url).toContain("https://snippets.bubble/share");
    });

    it("should generate QR code URL", () => {
      const shareable = createShareableSnippet(testSnippet);
      const qrUrl = generateQRCodeUrl(shareable.shareToken);
      expect(qrUrl).toContain("qrserver.com");
    });

    it("should validate shareable snippet", () => {
      const shareable = createShareableSnippet(testSnippet);
      expect(isShareableValid(shareable)).toBe(true);
    });

    it("should detect expired time-limited shares", () => {
      const shareable: ShareableSnippet = {
        id: "share_1",
        snippetId: "snippet_1",
        shareToken: "token123",
        expiresAt: Date.now() - 1000,
        viewCount: 0,
        isPublic: true,
        createdAt: Date.now(),
      };

      expect(isShareableValid(shareable)).toBe(false);
    });

    it("should detect expired view-limited shares", () => {
      const shareable: ShareableSnippet = {
        id: "share_1",
        snippetId: "snippet_1",
        shareToken: "token123",
        maxViews: 5,
        viewCount: 5,
        isPublic: true,
        createdAt: Date.now(),
      };

      expect(isShareableValid(shareable)).toBe(false);
    });

    it("should increment view count", () => {
      const shareable = createShareableSnippet(testSnippet);
      const updated = incrementShareableViews(shareable);
      expect(updated.viewCount).toBe(1);
    });

    it("should create time-limited share", () => {
      const shareable = createTimeLimitedShare(testSnippet, 24);
      expect(shareable.expiresAt).toBeTruthy();
      expect(shareable.expiresAt! > Date.now()).toBe(true);
    });

    it("should create view-limited share", () => {
      const shareable = createViewLimitedShare(testSnippet, 10);
      expect(shareable.maxViews).toBe(10);
    });

    it("should get share expiration info", () => {
      const shareable = createShareableSnippet(testSnippet);
      const info = getShareExpirationInfo(shareable);
      expect(info.isExpired).toBe(false);
    });

    it("should format share expiration text", () => {
      const shareable = createShareableSnippet(testSnippet);
      const text = formatShareExpiration(shareable);
      expect(text).toContain("Never expires");
    });

    it("should get active shares", () => {
      const s1 = createShareableSnippet(testSnippet);
      const s2: ShareableSnippet = {
        id: "share_2",
        snippetId: "snippet_1",
        shareToken: "token2",
        expiresAt: Date.now() - 1000,
        viewCount: 0,
        isPublic: true,
        createdAt: Date.now(),
      };

      const active = getActiveShares([s1, s2], "snippet_1");
      expect(active.length).toBe(1);
      expect(active[0].id).toBe(s1.id);
    });

    it("should revoke a share", () => {
      const shareable = createShareableSnippet(testSnippet);
      const revoked = revokeShare(shareable);
      // Revoked share should have expiresAt set to now (or past)
      expect(revoked.expiresAt).toBeLessThanOrEqual(Date.now() + 100);
    });
  });
});
