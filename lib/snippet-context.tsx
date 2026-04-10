import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Snippet, SnippetInput, AppSettings, DEFAULT_SETTINGS, SearchOptions } from "./types";
import { searchSnippets as advancedSearchSnippets, trackRecentlyUsed, getMostUsedSnippets, getRecentlyUsedSnippets, generateAutoTags } from "./advanced-search";
import { formatCode } from "./code-formatter";

const SNIPPETS_KEY = "@snippets";
const SETTINGS_KEY = "@settings";

// --- State ---
interface SnippetState {
  snippets: Snippet[];
  settings: AppSettings;
  loaded: boolean;
}

const initialState: SnippetState = {
  snippets: [],
  settings: DEFAULT_SETTINGS,
  loaded: false,
};

// --- Actions ---
type Action =
  | { type: "LOAD"; snippets: Snippet[]; settings: AppSettings }
  | { type: "ADD"; snippet: Snippet }
  | { type: "UPDATE"; snippet: Snippet }
  | { type: "DELETE"; id: string }
  | { type: "TOGGLE_FAVORITE"; id: string }
  | { type: "TOGGLE_PIN"; id: string }
  | { type: "MARK_COPIED"; id: string }
  | { type: "UPDATE_SETTINGS"; settings: Partial<AppSettings> }
  | { type: "IMPORT"; snippets: Snippet[] };

function reducer(state: SnippetState, action: Action): SnippetState {
  switch (action.type) {
    case "LOAD":
      return { ...state, snippets: action.snippets, settings: action.settings, loaded: true };
    case "ADD":
      return { ...state, snippets: [action.snippet, ...state.snippets] };
    case "UPDATE":
      return {
        ...state,
        snippets: state.snippets.map((s) => (s.id === action.snippet.id ? action.snippet : s)),
      };
    case "DELETE":
      return { ...state, snippets: state.snippets.filter((s) => s.id !== action.id) };
    case "TOGGLE_FAVORITE":
      return {
        ...state,
        snippets: state.snippets.map((s) =>
          s.id === action.id ? { ...s, isFavorite: !s.isFavorite, updatedAt: Date.now() } : s
        ),
      };
    case "TOGGLE_PIN":
      return {
        ...state,
        snippets: state.snippets.map((s) =>
          s.id === action.id ? { ...s, isPinned: !s.isPinned, updatedAt: Date.now() } : s
        ),
      };
    case "MARK_COPIED":
      return {
        ...state,
        snippets: state.snippets.map((s) =>
          s.id === action.id ? { ...s, lastCopiedAt: Date.now() } : s
        ),
      };
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case "IMPORT":
      return { ...state, snippets: [...action.snippets, ...state.snippets] };
    default:
      return state;
  }
}

// --- Context ---
interface SnippetContextValue {
  state: SnippetState;
  addSnippet: (input: SnippetInput) => void;
  updateSnippet: (id: string, input: SnippetInput) => void;
  deleteSnippet: (id: string) => void;
  toggleFavorite: (id: string) => void;
  togglePin: (id: string) => void;
  markCopied: (id: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  importSnippets: (snippets: Snippet[]) => void;
  getSnippetById: (id: string) => Snippet | undefined;
  searchSnippets: (query: string) => Snippet[];
  advancedSearch: (options: SearchOptions) => Snippet[];
  getMostUsedSnippets: (limit?: number) => Snippet[];
  getRecentlyUsedSnippets: (limit?: number) => Snippet[];
  formatSnippetCode: (id: string, language: string) => Promise<void>;
  generateAutoTags: (code: string, language: string) => string[];
  getSortedSnippets: () => Snippet[];
  getFavorites: () => Snippet[];
  getLanguages: () => string[];
}

const SnippetContext = createContext<SnippetContextValue | null>(null);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function SnippetProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Load data on mount
  useEffect(() => {
    (async () => {
      try {
        const [snippetsJson, settingsJson] = await Promise.all([
          AsyncStorage.getItem(SNIPPETS_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);
        const snippets = snippetsJson ? JSON.parse(snippetsJson) : [];
        const settings = settingsJson ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) } : DEFAULT_SETTINGS;
        dispatch({ type: "LOAD", snippets, settings });
      } catch (e) {
        console.error("Failed to load data:", e);
        dispatch({ type: "LOAD", snippets: [], settings: DEFAULT_SETTINGS });
      }
    })();
  }, []);

  // Persist snippets whenever they change
  useEffect(() => {
    if (state.loaded) {
      AsyncStorage.setItem(SNIPPETS_KEY, JSON.stringify(state.snippets)).catch(console.error);
    }
  }, [state.snippets, state.loaded]);

  // Persist settings whenever they change
  useEffect(() => {
    if (state.loaded) {
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)).catch(console.error);
    }
  }, [state.settings, state.loaded]);

  const addSnippet = useCallback((input: SnippetInput) => {
    const now = Date.now();
    const snippet: Snippet = {
      ...input,
      id: generateId(),
      lastCopiedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: "ADD", snippet });
  }, []);

  const updateSnippet = useCallback((id: string, input: SnippetInput) => {
    const existing = stateRef.current.snippets.find((s) => s.id === id);
    if (!existing) return;
    const snippet: Snippet = {
      ...existing,
      ...input,
      updatedAt: Date.now(),
    };
    dispatch({ type: "UPDATE", snippet });
  }, []);

  const deleteSnippet = useCallback((id: string) => {
    dispatch({ type: "DELETE", id });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_FAVORITE", id });
  }, []);

  const togglePin = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_PIN", id });
  }, []);

  const markCopied = useCallback((id: string) => {
    dispatch({ type: "MARK_COPIED", id });
  }, []);

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    dispatch({ type: "UPDATE_SETTINGS", settings });
  }, []);

  const importSnippets = useCallback((snippets: Snippet[]) => {
    dispatch({ type: "IMPORT", snippets });
  }, []);

  const getSnippetById = useCallback(
    (id: string) => stateRef.current.snippets.find((s) => s.id === id),
    []
  );

  const searchSnippets = useCallback((query: string) => {
    const q = query.toLowerCase().trim();
    if (!q) return getSortedInternal(stateRef.current.snippets);
    return getSortedInternal(
      stateRef.current.snippets.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.language.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q))
      )
    );
  }, []);

  const advancedSearch = useCallback((options: SearchOptions) => {
    // Use the advanced search from advanced-search.ts
    const results = advancedSearchSnippets(stateRef.current.snippets, options);
    return results.map((r) => r.snippet);
  }, []);

  const getMostUsedSnippetsInternal = useCallback((limit = 10) => {
    return getMostUsedSnippets(stateRef.current.snippets, limit);
  }, []);

  const getRecentlyUsedSnippetsInternal = useCallback((limit = 10) => {
    return getRecentlyUsedSnippets(stateRef.current.snippets, limit);
  }, []);

  const formatSnippetCodeInternal = useCallback(async (id: string, language: string) => {
    const snippet = stateRef.current.snippets.find((s) => s.id === id);
    if (!snippet) return;

    try {
      const formatted = await formatCode(snippet.code, language);
      updateSnippet(id, { ...snippet, code: formatted });
    } catch (error) {
      console.error("Failed to format code:", error);
    }
  }, []);

  const generateAutoTagsInternal = useCallback((code: string, language: string) => {
    return generateAutoTags(code, language);
  }, []);

  const getSortedSnippets = useCallback(() => {
    return getSortedInternal(stateRef.current.snippets);
  }, []);

  const getFavorites = useCallback(() => {
    return getSortedInternal(stateRef.current.snippets.filter((s) => s.isFavorite));
  }, []);

  const getLanguages = useCallback(() => {
    const langs = new Set<string>();
    stateRef.current.snippets.forEach((s) => {
      if (s.language) langs.add(s.language);
    });
    return Array.from(langs).sort();
  }, []);

  const value: SnippetContextValue = {
    state,
    addSnippet,
    updateSnippet,
    deleteSnippet,
    toggleFavorite,
    togglePin,
    markCopied,
    updateSettings,
    importSnippets,
    getSnippetById,
    searchSnippets,
    advancedSearch,
    getMostUsedSnippets: getMostUsedSnippetsInternal,
    getRecentlyUsedSnippets: getRecentlyUsedSnippetsInternal,
    formatSnippetCode: formatSnippetCodeInternal,
    generateAutoTags: generateAutoTagsInternal,
    getSortedSnippets,
    getFavorites,
    getLanguages,
  };

  return <SnippetContext.Provider value={value}>{children}</SnippetContext.Provider>;
}

function getSortedInternal(snippets: Snippet[]): Snippet[] {
  return [...snippets].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}



export function useSnippets() {
  const ctx = useContext(SnippetContext);
  if (!ctx) throw new Error("useSnippets must be used within SnippetProvider");
  return ctx;
}
