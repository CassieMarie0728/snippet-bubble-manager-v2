import type { Snippet } from "./types";

const MAX_IMPORT_SNIPPETS = 5_000;
const MAX_CODE_LENGTH = 500_000;

export type DuplicateStrategy = "skip" | "replace" | "copy";

export type ImportRejection = {
  index: number;
  reason: string;
};

export type ParsedSnippetImport = {
  snippets: Snippet[];
  rejected: ImportRejection[];
};

export type ImportPlan = {
  snippets: Snippet[];
  imported: number;
  skipped: number;
  replaced: number;
  copied: number;
  rejected: ImportRejection[];
};

function makeId(seed: number, index: number) {
  return `import_${seed.toString(36)}_${index.toString(36)}`;
}

function asFiniteTimestamp(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeTags(value: unknown) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return [...new Set(source.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean))].slice(0, 25);
}

function fingerprint(snippet: Pick<Snippet, "title" | "code" | "language">) {
  return `${snippet.title}\u0000${snippet.language}\u0000${snippet.code}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function parseSnippetImport(raw: unknown, now = Date.now()): ParsedSnippetImport {
  const root = asRecord(raw);
  const source = Array.isArray(raw) ? raw : root?.snippets;
  if (!Array.isArray(source)) {
    return { snippets: [], rejected: [{ index: -1, reason: "Expected a JSON array or an object with a snippets array." }] };
  }
  const rejected: ImportRejection[] = [];
  const snippets: Snippet[] = [];
  source.slice(0, MAX_IMPORT_SNIPPETS).forEach((candidate, index) => {
    const record = asRecord(candidate);
    if (!record) {
      rejected.push({ index, reason: "Snippet must be a JSON object." });
      return;
    }
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const code = typeof record.code === "string" ? record.code : "";
    const language = typeof record.language === "string" && record.language.trim() ? record.language.trim() : "Plaintext";
    if (!title) {
      rejected.push({ index, reason: "Title is required." });
      return;
    }
    if (!code) {
      rejected.push({ index, reason: "Code is required." });
      return;
    }
    if (title.length > 255 || code.length > MAX_CODE_LENGTH || language.length > 80) {
      rejected.push({ index, reason: "Snippet exceeds supported title, code, or language length." });
      return;
    }
    snippets.push({
      id: typeof record.id === "string" && record.id.trim() ? record.id.trim().slice(0, 64) : makeId(now, index),
      title,
      code,
      language,
      description: typeof record.description === "string" ? record.description.slice(0, 20_000) : "",
      tags: normalizeTags(record.tags ?? record.tags_csv),
      categoryId: typeof record.categoryId === "string" ? record.categoryId : undefined,
      collectionIds: Array.isArray(record.collectionIds)
        ? record.collectionIds.filter((id): id is string => typeof id === "string").slice(0, 100)
        : undefined,
      isFavorite: Boolean(record.isFavorite),
      isPinned: Boolean(record.isPinned),
      lastCopiedAt: null,
      copyCount: typeof record.copyCount === "number" && Number.isInteger(record.copyCount) && record.copyCount >= 0 ? record.copyCount : 0,
      createdAt: asFiniteTimestamp(record.createdAt, now),
      updatedAt: asFiniteTimestamp(record.updatedAt, now),
    });
  });
  if (source.length > MAX_IMPORT_SNIPPETS) {
    rejected.push({ index: MAX_IMPORT_SNIPPETS, reason: `Import is capped at ${MAX_IMPORT_SNIPPETS.toLocaleString()} snippets.` });
  }
  return { snippets, rejected };
}

export function planSnippetImport(
  existing: Snippet[],
  parsed: ParsedSnippetImport,
  strategy: DuplicateStrategy,
  now = Date.now(),
): ImportPlan {
  const next = [...existing];
  const known = new Map(existing.map((snippet, index) => [fingerprint(snippet), index]));
  let imported = 0;
  let skipped = 0;
  let replaced = 0;
  let copied = 0;

  for (const [index, candidate] of parsed.snippets.entries()) {
    const key = fingerprint(candidate);
    const duplicateAt = known.get(key);
    if (duplicateAt === undefined) {
      const id = next.some((snippet) => snippet.id === candidate.id) ? makeId(now, index) : candidate.id;
      next.unshift({ ...candidate, id, createdAt: candidate.createdAt || now, updatedAt: now });
      known.set(key, 0);
      imported += 1;
      continue;
    }
    if (strategy === "skip") {
      skipped += 1;
      continue;
    }
    if (strategy === "replace") {
      const existingSnippet = next[duplicateAt];
      next[duplicateAt] = { ...candidate, id: existingSnippet.id, createdAt: existingSnippet.createdAt, updatedAt: now };
      replaced += 1;
      continue;
    }
    next.unshift({ ...candidate, id: makeId(now, index), title: `${candidate.title} (Imported Copy)`, createdAt: now, updatedAt: now });
    copied += 1;
  }
  return { snippets: next, imported, skipped, replaced, copied, rejected: parsed.rejected };
}
