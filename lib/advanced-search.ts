/**
 * Advanced Search Service
 * Provides full-text search, regex search, pattern-based search, and recently-used tracking
 */

import type { Snippet, SearchOptions } from "./types";

export interface SearchResult {
  snippet: Snippet;
  score: number;
  matchType: "title" | "code" | "description" | "tags" | "language";
  preview?: string;
}

/**
 * Full-text search across snippets
 */
export function searchSnippets(
  snippets: Snippet[],
  options: SearchOptions
): SearchResult[] {
  if (!options.query && !options.language && !options.categoryId && !options.collectionId) {
    return snippets.map((s) => ({ snippet: s, score: 0, matchType: "title" }));
  }

  let results: SearchResult[] = [];

  // Filter by category
  let filtered = snippets;
  if (options.categoryId) {
    filtered = filtered.filter((s) => s.categoryId === options.categoryId);
  }

  // Filter by collection
  if (options.collectionId) {
    const collId = options.collectionId;
    filtered = filtered.filter((s) => s.collectionIds?.includes(collId));
  }

  // Filter by language
  if (options.language) {
    const lang = options.language.toLowerCase();
    filtered = filtered.filter((s) => s.language.toLowerCase() === lang);
  }

  // Filter by favorite
  if (options.isFavorite !== undefined) {
    filtered = filtered.filter((s) => s.isFavorite === options.isFavorite);
  }

  // Filter by pinned
  if (options.isPinned !== undefined) {
    filtered = filtered.filter((s) => s.isPinned === options.isPinned);
  }

  // Search by query
  if (options.query) {
    if (options.useRegex) {
      results = searchWithRegex(filtered, options.query);
    } else {
      results = searchFullText(filtered, options.query);
    }
  } else {
    results = filtered.map((s) => ({ snippet: s, score: 0, matchType: "title" }));
  }

  // Sort results
  if (options.sortBy) {
    results = sortResults(results, options.sortBy);
  } else {
    results = results.sort((a, b) => b.score - a.score);
  }

  return results;
}

/**
 * Full-text search: searches title, code, description, tags
 */
function searchFullText(snippets: Snippet[], query: string): SearchResult[] {
  const queryLower = query.toLowerCase();
  const results: SearchResult[] = [];

  snippets.forEach((snippet) => {
    let score = 0;
    let matchType: SearchResult["matchType"] = "title";

    // Title match (highest weight)
    if (snippet.title.toLowerCase().includes(queryLower)) {
      score += 100;
      matchType = "title";
    }

    // Language match
    if (snippet.language.toLowerCase().includes(queryLower)) {
      score += 50;
      matchType = "language";
    }

    // Tags match
    const tagMatch = snippet.tags.some((tag) => tag.toLowerCase().includes(queryLower));
    if (tagMatch) {
      score += 40;
      matchType = "tags";
    }

    // Description match
    if (snippet.description.toLowerCase().includes(queryLower)) {
      score += 30;
      matchType = "description";
    }

    // Code match (lowest weight, but important)
    if (snippet.code.toLowerCase().includes(queryLower)) {
      score += 10;
      matchType = "code";
    }

    if (score > 0) {
      results.push({
        snippet,
        score,
        matchType,
        preview: generatePreview(snippet, queryLower),
      });
    }
  });

  return results;
}

/**
 * Regex search: searches code and description with regex patterns
 */
function searchWithRegex(snippets: Snippet[], pattern: string): SearchResult[] {
  const results: SearchResult[] = [];

  try {
    const regex = new RegExp(pattern, "gi");

    snippets.forEach((snippet) => {
      let score = 0;
      let matchType: SearchResult["matchType"] = "code";

      // Code match
      const codeMatches = snippet.code.match(regex);
      if (codeMatches) {
        score += codeMatches.length * 50;
        matchType = "code";
      }

      // Description match
      const descMatches = snippet.description.match(regex);
      if (descMatches) {
        score += descMatches.length * 30;
        matchType = "description";
      }

      // Title match
      const titleMatches = snippet.title.match(regex);
      if (titleMatches) {
        score += titleMatches.length * 100;
        matchType = "title";
      }

      if (score > 0) {
        results.push({
          snippet,
          score,
          matchType,
          preview: generateRegexPreview(snippet, pattern),
        });
      }
    });
  } catch (error) {
    // Invalid regex pattern, return empty results
    console.error("Invalid regex pattern:", error);
    return [];
  }

  return results;
}

/**
 * Pattern-based search: finds snippets matching common patterns
 */
export function searchByPattern(snippets: Snippet[], pattern: string): Snippet[] {
  const patterns: Record<string, (code: string) => boolean> = {
    "error-handling": (code) => /try|catch|throw|Error|Exception/.test(code),
    "loop": (code) => /for|while|forEach|map|filter|reduce/.test(code),
    "async": (code) => /async|await|Promise|then|callback/.test(code),
    "database": (code) => /SELECT|INSERT|UPDATE|DELETE|JOIN|WHERE/.test(code),
    "api": (code) => /fetch|axios|http|request|response|endpoint/.test(code),
    "authentication": (code) => /auth|login|password|token|jwt|oauth/.test(code),
    "validation": (code) => /validate|check|verify|assert|test|expect/.test(code),
    "logging": (code) => /log|console|print|debug|warn|error/.test(code),
    "string-manipulation": (code) => /split|join|replace|substring|trim|match/.test(code),
    "array-manipulation": (code) => /push|pop|shift|unshift|slice|splice|concat/.test(code),
  };

  const matcher = patterns[pattern.toLowerCase()];
  if (!matcher) return [];

  return snippets.filter((snippet) => matcher(snippet.code));
}

/**
 * Track recently used snippets
 */
export function trackRecentlyUsed(snippet: Snippet): Snippet {
  return {
    ...snippet,
    lastCopiedAt: Date.now(),
    copyCount: (snippet.copyCount || 0) + 1,
  };
}

/**
 * Get most-used snippets
 */
export function getMostUsedSnippets(snippets: Snippet[], limit: number = 10): Snippet[] {
  return [...snippets]
    .sort((a, b) => (b.copyCount || 0) - (a.copyCount || 0))
    .slice(0, limit);
}

/**
 * Get recently-used snippets
 */
export function getRecentlyUsedSnippets(snippets: Snippet[], limit: number = 10): Snippet[] {
  return [...snippets]
    .filter((s) => s.lastCopiedAt !== null)
    .sort((a, b) => (b.lastCopiedAt || 0) - (a.lastCopiedAt || 0))
    .slice(0, limit);
}

/**
 * Generate preview text for search results
 */
function generatePreview(snippet: Snippet, query: string): string {
  const lines = snippet.code.split("\n");
  const matchingLines = lines.filter((line) => line.toLowerCase().includes(query));

  if (matchingLines.length > 0) {
    return matchingLines.slice(0, 2).join("\n").substring(0, 100);
  }

  return snippet.code.substring(0, 100);
}

/**
 * Generate preview for regex search
 */
function generateRegexPreview(snippet: Snippet, pattern: string): string {
  try {
    const regex = new RegExp(pattern, "gi");
    const lines = snippet.code.split("\n");
    const matchingLines = lines.filter((line) => regex.test(line));

    if (matchingLines.length > 0) {
      return matchingLines.slice(0, 2).join("\n").substring(0, 100);
    }
  } catch (error) {
    // Ignore regex errors
  }

  return snippet.code.substring(0, 100);
}

/**
 * Sort search results
 */
function sortResults(results: SearchResult[], sortBy: string): SearchResult[] {
  switch (sortBy) {
    case "title":
      return results.sort((a, b) => a.snippet.title.localeCompare(b.snippet.title));
    case "recent":
      return results.sort((a, b) => b.snippet.updatedAt - a.snippet.updatedAt);
    case "mostUsed":
      return results.sort((a, b) => (b.snippet.copyCount || 0) - (a.snippet.copyCount || 0));
    case "pinned":
      return results.sort((a, b) => {
        if (a.snippet.isPinned === b.snippet.isPinned) {
          return b.snippet.isPinned ? 0 : 0;
        }
        return a.snippet.isPinned ? -1 : 1;
      });
    default:
      return results.sort((a, b) => b.score - a.score);
  }
}

/**
 * Search snippets by code content patterns (e.g., "async/await", "try/catch")
 */
export function searchByCodeContent(snippets: Snippet[], contentQuery: string): SearchResult[] {
  const queryLower = contentQuery.toLowerCase();
  const results: SearchResult[] = [];

  snippets.forEach((snippet) => {
    let score = 0;
    let matchType: SearchResult["matchType"] = "code";

    // Direct code search
    if (snippet.code.toLowerCase().includes(queryLower)) {
      score += 50;
      matchType = "code";
    }

    if (score > 0) {
      results.push({
        snippet,
        score,
        matchType,
        preview: generateCodeContentPreview(snippet, queryLower),
      });
    }
  });

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Generate preview for code content search
 */
function generateCodeContentPreview(snippet: Snippet, query: string): string {
  const lines = snippet.code.split("\n");
  const matchingLines = lines.filter((line) => line.toLowerCase().includes(query));

  if (matchingLines.length > 0) {
    return matchingLines.slice(0, 3).join("\n").substring(0, 150);
  }

  return snippet.code.substring(0, 150);
}

/**
 * Auto-detect frameworks and libraries from code
 */
export function detectFrameworks(code: string): string[] {
  const frameworks: Record<string, RegExp> = {
    React: /import.*from\s+['"]react['"]|from\s+['"]react-dom['"]|React\.createElement/,
    Vue: /import.*from\s+['"]vue['"]|Vue\.component|new Vue/,
    Angular: /import.*from\s+['"]@angular|@NgModule|@Component/,
    Express: /import.*from\s+['"]express['"]|require\(['"]express['"]\)|app\.get|app\.post/,
    Django: /from django|import django|@app\.route|def.*request/,
    Flask: /from flask|import flask|@app\.route|@bp\.route/,
    FastAPI: /from fastapi|import fastapi|@app\.get|@app\.post/,
    Node: /require\(['"]|import.*from\s+['"]|module\.exports|exports\./,
    Python: /^import |^from |def |class |if __name__/m,
    Java: /public class|public static void|import java\.|package /,
    Go: /package |import \(|func |type |interface /,
    Rust: /fn |mod |use |impl |trait |struct /,
  };

  const detected: string[] = [];
  Object.entries(frameworks).forEach(([framework, regex]) => {
    if (regex.test(code)) {
      detected.push(framework);
    }
  });

  return detected;
}

/**
 * Generate auto-tags from code
 */
export function generateAutoTags(code: string, language: string): string[] {
  const tags: Set<string> = new Set();

  // Add language as tag
  tags.add(language.toLowerCase());

  // Detect frameworks
  const frameworks = detectFrameworks(code);
  frameworks.forEach((f) => tags.add(f.toLowerCase()));

  // Detect patterns
  if (/try|catch|throw|Error/.test(code)) tags.add("error-handling");
  if (/async|await|Promise|then/.test(code)) tags.add("async");
  if (/SELECT|INSERT|UPDATE|DELETE/.test(code)) tags.add("database");
  if (/fetch|axios|http|request/.test(code)) tags.add("api");
  if (/auth|login|password|token/.test(code)) tags.add("authentication");
  if (/test|expect|assert|describe/.test(code)) tags.add("testing");
  if (/for|while|forEach|map|filter/.test(code)) tags.add("loops");

  return Array.from(tags);
}
