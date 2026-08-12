export interface Snippet {
  id: string;
  title: string;
  code: string;
  language: string;
  description: string;
  tags: string[];
  categoryId?: string;
  collectionIds?: string[];
  isFavorite: boolean;
  isPinned: boolean;
  lastCopiedAt: number | null;
  copyCount?: number;
  createdAt: number;
  updatedAt: number;
}

export type SnippetInput = Omit<Snippet, "id" | "createdAt" | "updatedAt" | "lastCopiedAt" | "copyCount">;

export interface SnippetVersion {
  id: string;
  snippetId: string;
  code: string;
  title: string;
  language: string;
  changeDescription?: string;
  createdAt: number;
}

export interface ShareableSnippet {
  id: string;
  snippetId: string;
  shareToken: string;
  viewCount: number;
  isPublic: boolean;
  expiresAt?: number;
  maxViews?: number;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  icon?: string;
  color?: string;
  description?: string;
  snippetCount?: number;
  createdAt: number;
  updatedAt: number;
}

export type CategoryInput = Omit<Category, "id" | "createdAt" | "updatedAt" | "snippetCount">;

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  snippetIds: string[];
  isPublic?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type CollectionInput = Omit<Collection, "id" | "createdAt" | "updatedAt">;

export interface SearchOptions {
  query?: string;
  language?: string;
  categoryId?: string;
  collectionId?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  useRegex?: boolean;
  sortBy?: "recent" | "title" | "mostUsed" | "pinned";
}

export interface AutoTagResult {
  tags: string[];
  detectedFrameworks: string[];
  detectedLibraries: string[];
}

export interface AppSettings {
  bubbleEnabled: boolean;
  bubbleSize: "small" | "medium" | "large";
  bubbleOpacity: number;
  snapToEdge: boolean;
  defaultView: "pinned" | "recent";
  hapticFeedback: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  bubbleEnabled: false,
  bubbleSize: "medium",
  bubbleOpacity: 0.8,
  snapToEdge: true,
  defaultView: "pinned",
  hapticFeedback: true,
};

export const LANGUAGES = [
  "C",
  "C++",
  "C#",
  "Java",
  "Python",
  "JavaScript",
  "TypeScript",
  "PHP",
  "R",
  "SQL",
  "Go",
  "Swift",
  "Perl",
  "Ruby",
  "Rust",
  "Dart",
  "Kotlin",
  "Julia",
  "Scheme",
  "PowerShell",
  "Bash",
  "Curl",
  "Nim",
  "Erlang",
  "Lobster",
  "Lua",
  "Haskell",
  "Lisp",
  "Scala",
  "Dockerfile",
  "JSON",
  "CSS",
  "SCSS",
  "HTML",
  "XML",
  "YAML",
  "Markdown",
  "Plaintext",
  "Assembly",
  "Bat",
  "GraphQL",
  "MySQL",
  "MariaDB",
  "PostgreSQL",
  "HTTP",
  "Sass",
  "LaTeX",
] as const;

export type FilterType = "all" | "pinned" | "recent" | "favorites" | string;

export interface VersionHistoryItem {
  version: SnippetVersion;
  isCurrent: boolean;
  daysAgo: number;
  changeSize: number;
}

export interface ShareExpirationInfo {
  isExpired: boolean;
  expiresAt?: Date;
  viewsRemaining?: number;
}

export const CATEGORY_TEMPLATES: Record<string, CategoryInput> = {
  backend: {
    name: "Backend",
    icon: "server",
    color: "#3B82F6",
    description: "Server-side code and APIs",
  },
  frontend: {
    name: "Frontend",
    icon: "code",
    color: "#8B5CF6",
    description: "Client-side and UI code",
  },
  database: {
    name: "Database",
    icon: "database",
    color: "#EC4899",
    description: "Database queries and schemas",
  },
  devops: {
    name: "DevOps",
    icon: "settings",
    color: "#F59E0B",
    description: "Infrastructure and deployment",
  },
  utilities: {
    name: "Utilities",
    icon: "tools",
    color: "#10B981",
    description: "Helper functions and utilities",
  },
};
