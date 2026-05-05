/**
 * Snippet Versioning Service
 * Handles version history, diffs, and reverting to previous versions
 */

import type { Snippet, SnippetVersion } from "./types";

/**
 * Create a new version of a snippet
 */
export function createSnippetVersion(
  snippet: Snippet,
  changeDescription?: string
): SnippetVersion {
  return {
    id: `v_${snippet.id}_${Date.now()}`,
    snippetId: snippet.id,
    code: snippet.code,
    title: snippet.title,
    language: snippet.language,
    changeDescription: changeDescription || "Updated",
    createdAt: Date.now(),
  };
}

/**
 * Get all versions for a specific snippet
 */
export function getSnippetVersions(
  allVersions: SnippetVersion[],
  snippetId: string
): SnippetVersion[] {
  return allVersions
    .filter((v) => v.snippetId === snippetId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Revert snippet to a previous version
 */
export function revertToVersion(
  currentSnippet: Snippet,
  targetVersion: SnippetVersion
): Snippet {
  return {
    ...currentSnippet,
    code: targetVersion.code,
    title: targetVersion.title,
    language: targetVersion.language,
    updatedAt: Date.now(),
  };
}

/**
 * Calculate diff between two code versions
 */
export function calculateVersionDiff(
  oldCode: string,
  newCode: string
): { added: number; removed: number; changed: number } {
  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");

  let added = 0;
  let removed = 0;
  let changed = 0;

  const maxLines = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || "";
    const newLine = newLines[i] || "";

    if (oldLine === newLine) continue;

    if (!oldLine) {
      added++;
    } else if (!newLine) {
      removed++;
    } else {
      changed++;
    }
  }

  return { added, removed, changed };
}

export interface VersionHistoryItem {
  version: SnippetVersion;
  isCurrent: boolean;
  daysAgo: number;
  changeSize: number;
}

/**
 * Get formatted version history
 */
export function getVersionHistory(
  allVersions: SnippetVersion[],
  snippetId: string,
  currentCode: string
): VersionHistoryItem[] {
  const versions = getSnippetVersions(allVersions, snippetId);
  const now = Date.now();

  return versions.map((version, index) => {
    const isCurrent = index === 0 && version.code === currentCode;
    const daysAgo = Math.floor((now - version.createdAt) / (1000 * 60 * 60 * 24));

    let changeSize = 0;
    if (index < versions.length - 1) {
      const nextVersion = versions[index + 1];
      const diff = calculateVersionDiff(nextVersion.code, version.code);
      changeSize = diff.added + diff.removed + diff.changed;
    }

    return {
      version,
      isCurrent,
      daysAgo,
      changeSize,
    };
  });
}

/**
 * Prune old versions, keeping only the most recent N
 */
export function pruneOldVersions(
  allVersions: SnippetVersion[],
  snippetId: string,
  maxVersions: number
): SnippetVersion[] {
  const versions = getSnippetVersions(allVersions, snippetId);
  const otherVersions = allVersions.filter((v) => v.snippetId !== snippetId);

  if (versions.length <= maxVersions) {
    return allVersions;
  }

  const keptVersions = versions.slice(0, maxVersions);
  return [...otherVersions, ...keptVersions];
}

export interface VersionStats {
  totalVersions: number;
  oldestVersion?: SnippetVersion;
  newestVersion?: SnippetVersion;
  averageChangeSize: number;
}

/**
 * Get statistics about snippet versions
 */
export function getVersionStats(
  allVersions: SnippetVersion[],
  snippetId: string
): VersionStats {
  const versions = getSnippetVersions(allVersions, snippetId);

  if (versions.length === 0) {
    return {
      totalVersions: 0,
      averageChangeSize: 0,
    };
  }

  const newestVersion = versions[0];
  const oldestVersion = versions[versions.length - 1];

  let totalChanges = 0;
  for (let i = 0; i < versions.length - 1; i++) {
    const diff = calculateVersionDiff(versions[i + 1].code, versions[i].code);
    totalChanges += diff.added + diff.removed + diff.changed;
  }

  const averageChangeSize =
    versions.length > 1 ? totalChanges / (versions.length - 1) : 0;

  return {
    totalVersions: versions.length,
    oldestVersion,
    newestVersion,
    averageChangeSize,
  };
}
