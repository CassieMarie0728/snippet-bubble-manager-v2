export interface Snippet {
  id: string;
  title: string;
  code: string;
  language: string;
  description: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  lastCopiedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type SnippetInput = Omit<Snippet, "id" | "createdAt" | "updatedAt" | "lastCopiedAt">;

export interface AppSettings {
  bubbleSize: "small" | "medium" | "large";
  bubbleOpacity: number;
  snapToEdge: boolean;
  defaultView: "pinned" | "recent";
  hapticFeedback: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  bubbleSize: "medium",
  bubbleOpacity: 0.8,
  snapToEdge: true,
  defaultView: "pinned",
  hapticFeedback: true,
};

export const LANGUAGES = [
  "Kotlin",
  "JavaScript",
  "TypeScript",
  "Python",
  "Bash",
  "SQL",
  "JSON",
  "HTML",
  "CSS",
  "Swift",
  "Go",
  "Rust",
  "C++",
  "Java",
  "Ruby",
  "PHP",
  "Shell",
  "YAML",
  "XML",
  "Other",
] as const;

export type FilterType = "all" | "pinned" | "recent" | string;
