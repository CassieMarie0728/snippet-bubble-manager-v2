import type { Snippet } from "./types";

export type CloudSnippet = {
  clientId: string;
  title: string;
  code: string;
  language: string;
  description: string;
  tags: string[];
  categoryClientId?: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  copyCount?: number;
  lastCopiedAt?: Date | string | number | null;
  revision: number;
  deletedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type CloudSnippetInput = {
  clientId: string;
  title: string;
  code: string;
  language: string;
  description: string;
  tags: string[];
  categoryClientId?: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  copyCount?: number;
  lastCopiedAt?: number | null;
};

export type SyncConflict = {
  clientId: string;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
  resolution: "local-wins" | "remote-wins";
};

function asTimestamp(value: Date | string | number | null | undefined): number {
  if (value == null) return 0;
  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function toCloudSnippetInput(snippet: Snippet): CloudSnippetInput {
  return {
    clientId: snippet.id,
    title: snippet.title,
    code: snippet.code,
    language: snippet.language,
    description: snippet.description,
    tags: snippet.tags,
    categoryClientId: snippet.categoryId ?? null,
    isFavorite: snippet.isFavorite,
    isPinned: snippet.isPinned,
    copyCount: snippet.copyCount ?? 0,
    lastCopiedAt: snippet.lastCopiedAt,
  };
}

export function fromCloudSnippet(snippet: CloudSnippet): Snippet {
  return {
    id: snippet.clientId,
    title: snippet.title,
    code: snippet.code,
    language: snippet.language,
    description: snippet.description,
    tags: snippet.tags,
    categoryId: snippet.categoryClientId ?? undefined,
    isFavorite: snippet.isFavorite,
    isPinned: snippet.isPinned,
    lastCopiedAt: asTimestamp(snippet.lastCopiedAt) || null,
    copyCount: snippet.copyCount ?? 0,
    createdAt: asTimestamp(snippet.createdAt),
    updatedAt: asTimestamp(snippet.updatedAt),
  };
}

export function mergeCloudSnippets(local: Snippet[], remote: CloudSnippet[]) {
  const localById = new Map(local.map((snippet) => [snippet.id, snippet]));
  const merged: Snippet[] = [];
  const upload: Snippet[] = [];
  const conflicts: SyncConflict[] = [];

  for (const remoteSnippet of remote) {
    const localSnippet = localById.get(remoteSnippet.clientId);
    const remoteUpdatedAt = asTimestamp(remoteSnippet.updatedAt);
    if (!localSnippet) {
      merged.push(fromCloudSnippet(remoteSnippet));
      continue;
    }

    const localUpdatedAt = localSnippet.updatedAt;
    if (localUpdatedAt > remoteUpdatedAt) {
      merged.push(localSnippet);
      upload.push(localSnippet);
      conflicts.push({
        clientId: localSnippet.id,
        localUpdatedAt,
        remoteUpdatedAt,
        resolution: "local-wins",
      });
    } else if (remoteUpdatedAt > localUpdatedAt) {
      merged.push(fromCloudSnippet(remoteSnippet));
      conflicts.push({
        clientId: localSnippet.id,
        localUpdatedAt,
        remoteUpdatedAt,
        resolution: "remote-wins",
      });
    } else {
      merged.push(localSnippet);
    }
    localById.delete(remoteSnippet.clientId);
  }

  for (const localOnly of localById.values()) {
    merged.push(localOnly);
    upload.push(localOnly);
  }

  return { merged, upload, conflicts };
}
