/**
 * Snippet Sharing Service
 * Handles shareable links, QR codes, and share management
 */

import type { Snippet, ShareableSnippet, ShareExpirationInfo } from "./types";

const SHARE_BASE_URL = "https://snippets.bubble/share";

/**
 * Generate a random share token
 */
function generateShareToken(): string {
  return Math.random().toString(36).substr(2, 12);
}

/**
 * Create a shareable snippet
 */
export function createShareableSnippet(snippet: Snippet): ShareableSnippet {
  return {
    id: `share_${Date.now()}`,
    snippetId: snippet.id,
    shareToken: generateShareToken(),
    viewCount: 0,
    isPublic: true,
    createdAt: Date.now(),
  };
}

/**
 * Generate a share URL
 */
export function generateShareUrl(shareToken: string): string {
  return `${SHARE_BASE_URL}/${shareToken}`;
}

/**
 * Generate a QR code URL (using qrserver.com)
 */
export function generateQRCodeUrl(shareToken: string): string {
  const shareUrl = generateShareUrl(shareToken);
  const encoded = encodeURIComponent(shareUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
}

/**
 * Check if a shareable snippet is valid (not expired)
 */
export function isShareableValid(shareable: ShareableSnippet): boolean {
  // Check time expiration
  if (shareable.expiresAt && shareable.expiresAt < Date.now()) {
    return false;
  }

  // Check view limit
  if (shareable.maxViews && shareable.viewCount >= shareable.maxViews) {
    return false;
  }

  return true;
}

/**
 * Increment view count for a shareable snippet
 */
export function incrementShareableViews(
  shareable: ShareableSnippet
): ShareableSnippet {
  return {
    ...shareable,
    viewCount: shareable.viewCount + 1,
  };
}

/**
 * Create a time-limited share (expires after N hours)
 */
export function createTimeLimitedShare(
  snippet: Snippet,
  hoursValid: number
): ShareableSnippet {
  const expiresAt = Date.now() + hoursValid * 60 * 60 * 1000;

  return {
    id: `share_${Date.now()}`,
    snippetId: snippet.id,
    shareToken: generateShareToken(),
    viewCount: 0,
    isPublic: true,
    expiresAt,
    createdAt: Date.now(),
  };
}

/**
 * Create a view-limited share (expires after N views)
 */
export function createViewLimitedShare(
  snippet: Snippet,
  maxViews: number
): ShareableSnippet {
  return {
    id: `share_${Date.now()}`,
    snippetId: snippet.id,
    shareToken: generateShareToken(),
    viewCount: 0,
    isPublic: true,
    maxViews,
    createdAt: Date.now(),
  };
}

/**
 * Get expiration information for a shareable snippet
 */
export function getShareExpirationInfo(
  shareable: ShareableSnippet
): ShareExpirationInfo {
  const isExpired = !isShareableValid(shareable);

  let expiresAt: Date | undefined;
  let viewsRemaining: number | undefined;

  if (shareable.expiresAt) {
    expiresAt = new Date(shareable.expiresAt);
  }

  if (shareable.maxViews) {
    viewsRemaining = Math.max(0, shareable.maxViews - shareable.viewCount);
  }

  return {
    isExpired,
    expiresAt,
    viewsRemaining,
  };
}

/**
 * Format share expiration text
 */
export function formatShareExpiration(shareable: ShareableSnippet): string {
  const info = getShareExpirationInfo(shareable);

  if (info.isExpired) {
    return "Expired";
  }

  if (info.expiresAt) {
    const now = new Date();
    const diffMs = info.expiresAt.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Expires in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
    } else if (diffHours > 0) {
      return `Expires in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
    } else {
      return "Expires soon";
    }
  }

  if (info.viewsRemaining !== undefined) {
    return `${info.viewsRemaining} view${info.viewsRemaining !== 1 ? "s" : ""} remaining`;
  }

  return "Never expires";
}

/**
 * Get all active shares for a snippet
 */
export function getActiveShares(
  allShares: ShareableSnippet[],
  snippetId: string
): ShareableSnippet[] {
  return allShares.filter(
    (share) => share.snippetId === snippetId && isShareableValid(share)
  );
}

/**
 * Get all expired shares for a snippet
 */
export function getExpiredShares(
  allShares: ShareableSnippet[],
  snippetId: string
): ShareableSnippet[] {
  return allShares.filter(
    (share) => share.snippetId === snippetId && !isShareableValid(share)
  );
}

/**
 * Revoke a share (mark as expired)
 */
export function revokeShare(shareable: ShareableSnippet): ShareableSnippet {
  return {
    ...shareable,
    expiresAt: Date.now(), // Expire immediately
  };
}
