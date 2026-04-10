/**
 * Category and Collection Context
 * Manages hierarchical categories and snippet collections with AsyncStorage persistence
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Simple UUID v4 generator
function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
import type { Category, Collection, CategoryInput, CollectionInput } from "./types";
import { CATEGORY_TEMPLATES } from "./types";

interface CategoryCollectionState {
  categories: Category[];
  collections: Collection[];
  loading: boolean;
  error: string | null;
}

type CategoryCollectionAction =
  | { type: "SET_CATEGORIES"; payload: Category[] }
  | { type: "SET_COLLECTIONS"; payload: Collection[] }
  | { type: "ADD_CATEGORY"; payload: Category }
  | { type: "UPDATE_CATEGORY"; payload: Category }
  | { type: "DELETE_CATEGORY"; payload: string }
  | { type: "ADD_COLLECTION"; payload: Collection }
  | { type: "UPDATE_COLLECTION"; payload: Collection }
  | { type: "DELETE_COLLECTION"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

const initialState: CategoryCollectionState = {
  categories: [],
  collections: [],
  loading: false,
  error: null,
};

function reducer(state: CategoryCollectionState, action: CategoryCollectionAction): CategoryCollectionState {
  switch (action.type) {
    case "SET_CATEGORIES":
      return { ...state, categories: action.payload, loading: false };
    case "SET_COLLECTIONS":
      return { ...state, collections: action.payload, loading: false };
    case "ADD_CATEGORY":
      return { ...state, categories: [...state.categories, action.payload] };
    case "UPDATE_CATEGORY":
      return {
        ...state,
        categories: state.categories.map((c) => (c.id === action.payload.id ? action.payload : c)),
      };
    case "DELETE_CATEGORY":
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
      };
    case "ADD_COLLECTION":
      return { ...state, collections: [...state.collections, action.payload] };
    case "UPDATE_COLLECTION":
      return {
        ...state,
        collections: state.collections.map((c) => (c.id === action.payload.id ? action.payload : c)),
      };
    case "DELETE_COLLECTION":
      return {
        ...state,
        collections: state.collections.filter((c) => c.id !== action.payload),
      };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

interface CategoryCollectionContextType {
  state: CategoryCollectionState;
  addCategory: (input: CategoryInput) => Promise<Category>;
  updateCategory: (id: string, input: Partial<CategoryInput>) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoryHierarchy: () => Category[];
  getCategoryPath: (categoryId: string) => Category[];
  addCollection: (input: CollectionInput) => Promise<Collection>;
  updateCollection: (id: string, input: Partial<CollectionInput>) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
  addSnippetToCollection: (collectionId: string, snippetId: string) => Promise<void>;
  removeSnippetFromCollection: (collectionId: string, snippetId: string) => Promise<void>;
  initializeDefaultCategories: () => Promise<void>;
  loadData: () => Promise<void>;
}

const CategoryCollectionContext = createContext<CategoryCollectionContextType | undefined>(undefined);

export function CategoryCollectionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const [categoriesJson, collectionsJson] = await Promise.all([
        AsyncStorage.getItem("categories"),
        AsyncStorage.getItem("collections"),
      ]);

      if (categoriesJson) {
        dispatch({ type: "SET_CATEGORIES", payload: JSON.parse(categoriesJson) });
      }
      if (collectionsJson) {
        dispatch({ type: "SET_COLLECTIONS", payload: JSON.parse(collectionsJson) });
      }

      dispatch({ type: "SET_LOADING", payload: false });
    } catch (error) {
      console.error("Failed to load categories/collections:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to load data" });
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const saveCategories = useCallback(async (categories: Category[]) => {
    try {
      await AsyncStorage.setItem("categories", JSON.stringify(categories));
    } catch (error) {
      console.error("Failed to save categories:", error);
    }
  }, []);

  const saveCollections = useCallback(async (collections: Collection[]) => {
    try {
      await AsyncStorage.setItem("collections", JSON.stringify(collections));
    } catch (error) {
      console.error("Failed to save collections:", error);
    }
  }, []);

  const addCategory = useCallback(
    async (input: CategoryInput): Promise<Category> => {
      const category: Category = {
        id: uuid(),
        ...input,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      dispatch({ type: "ADD_CATEGORY", payload: category });
      await saveCategories([...state.categories, category]);
      return category;
    },
    [state.categories, saveCategories]
  );

  const updateCategory = useCallback(
    async (id: string, input: Partial<CategoryInput>): Promise<Category> => {
      const existing = state.categories.find((c) => c.id === id);
      if (!existing) throw new Error("Category not found");

      const updated: Category = {
        ...existing,
        ...input,
        updatedAt: Date.now(),
      };
      dispatch({ type: "UPDATE_CATEGORY", payload: updated });
      await saveCategories(state.categories.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    [state.categories, saveCategories]
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      dispatch({ type: "DELETE_CATEGORY", payload: id });
      await saveCategories(state.categories.filter((c) => c.id !== id));
    },
    [state.categories, saveCategories]
  );

  const getCategoryHierarchy = useCallback((): Category[] => {
    // Return top-level categories (no parentId)
    return state.categories.filter((c) => !c.parentId);
  }, [state.categories]);

  const getCategoryPath = useCallback(
    (categoryId: string): Category[] => {
      // Build path from root to category
      const path: Category[] = [];
      let current = state.categories.find((c) => c.id === categoryId);

      while (current) {
        path.unshift(current);
        current = current.parentId ? state.categories.find((c) => c.id === current!.parentId) : undefined;
      }

      return path;
    },
    [state.categories]
  );

  const addCollection = useCallback(
    async (input: CollectionInput): Promise<Collection> => {
      const collection: Collection = {
        id: uuid(),
        ...input,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      dispatch({ type: "ADD_COLLECTION", payload: collection });
      await saveCollections([...state.collections, collection]);
      return collection;
    },
    [state.collections, saveCollections]
  );

  const updateCollection = useCallback(
    async (id: string, input: Partial<CollectionInput>): Promise<Collection> => {
      const existing = state.collections.find((c) => c.id === id);
      if (!existing) throw new Error("Collection not found");

      const updated: Collection = {
        ...existing,
        ...input,
        updatedAt: Date.now(),
      };
      dispatch({ type: "UPDATE_COLLECTION", payload: updated });
      await saveCollections(state.collections.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    [state.collections, saveCollections]
  );

  const deleteCollection = useCallback(
    async (id: string): Promise<void> => {
      dispatch({ type: "DELETE_COLLECTION", payload: id });
      await saveCollections(state.collections.filter((c) => c.id !== id));
    },
    [state.collections, saveCollections]
  );

  const addSnippetToCollection = useCallback(
    async (collectionId: string, snippetId: string): Promise<void> => {
      const collection = state.collections.find((c) => c.id === collectionId);
      if (!collection) throw new Error("Collection not found");

      if (!collection.snippetIds.includes(snippetId)) {
        const updated = {
          ...collection,
          snippetIds: [...collection.snippetIds, snippetId],
          updatedAt: Date.now(),
        };
        dispatch({ type: "UPDATE_COLLECTION", payload: updated });
        await saveCollections(state.collections.map((c) => (c.id === collectionId ? updated : c)));
      }
    },
    [state.collections, saveCollections]
  );

  const removeSnippetFromCollection = useCallback(
    async (collectionId: string, snippetId: string): Promise<void> => {
      const collection = state.collections.find((c) => c.id === collectionId);
      if (!collection) throw new Error("Collection not found");

      const updated = {
        ...collection,
        snippetIds: collection.snippetIds.filter((id) => id !== snippetId),
        updatedAt: Date.now(),
      };
      dispatch({ type: "UPDATE_COLLECTION", payload: updated });
      await saveCollections(state.collections.map((c) => (c.id === collectionId ? updated : c)));
    },
    [state.collections, saveCollections]
  );

  const initializeDefaultCategories = useCallback(async () => {
    if (state.categories.length === 0) {
      const defaultCategories = await Promise.all(
        Object.values(CATEGORY_TEMPLATES).map((template) => addCategory(template))
      );
      await saveCategories(defaultCategories);
    }
  }, [state.categories.length, addCategory, saveCategories]);

  const value: CategoryCollectionContextType = {
    state,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryHierarchy,
    getCategoryPath,
    addCollection,
    updateCollection,
    deleteCollection,
    addSnippetToCollection,
    removeSnippetFromCollection,
    initializeDefaultCategories,
    loadData,
  };

  return (
    <CategoryCollectionContext.Provider value={value}>
      {children}
    </CategoryCollectionContext.Provider>
  );
}

export function useCategoryCollection() {
  const context = useContext(CategoryCollectionContext);
  if (!context) {
    throw new Error("useCategoryCollection must be used within CategoryCollectionProvider");
  }
  return context;
}
