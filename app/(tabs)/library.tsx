/**
 * Library Screen - Enhanced with Categories, Collections, and Advanced Search
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  TouchableOpacity,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { SnippetCard } from "@/components/snippet-card";
import { CategoryBrowser } from "@/components/category-browser";
import { CollectionManager } from "@/components/collection-manager";
import { useSnippets } from "@/lib/snippet-context";
import { useCategoryCollection } from "@/lib/category-collection-context";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import type { Category, Collection, SearchOptions } from "@/lib/types";

export default function LibraryScreen() {
  const { state: snippetState, advancedSearch, getLanguages } = useSnippets();
  const { state: categoryState, initializeDefaultCategories } = useCategoryCollection();
  const colors = useColors();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [useRegex, setUseRegex] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCategoryBrowser, setShowCategoryBrowser] = useState(false);
  const [showCollectionManager, setShowCollectionManager] = useState(false);
  const [filterLanguage, setFilterLanguage] = useState<string | null>(null);
  const [filterFavorite, setFilterFavorite] = useState<boolean | undefined>(undefined);
  const [filterPinned, setFilterPinned] = useState<boolean | undefined>(undefined);

  // Initialize default categories on mount
  useEffect(() => {
    initializeDefaultCategories();
  }, []);

  // Perform advanced search
  const searchResults = useMemo(() => {
    const options: SearchOptions = {
      query: searchQuery,
      language: filterLanguage || undefined,
      categoryId: selectedCategory?.id,
      collectionId: selectedCollection?.id,
      isFavorite: filterFavorite !== undefined ? filterFavorite : undefined,
      isPinned: filterPinned !== undefined ? filterPinned : undefined,
      useRegex,
      sortBy: "recent",
    };

    return advancedSearch(options);
  }, [searchQuery, filterLanguage, selectedCategory, selectedCollection, filterFavorite, filterPinned, useRegex]);

  const languages = getLanguages();

  const renderSearchBar = () => (
    <View className="gap-3 px-4 py-3 border-b border-border">
      <View className="flex-row gap-2 items-center">
        <View className="flex-1 flex-row items-center bg-surface border border-border rounded-lg px-3">
          <Text className="text-lg text-muted">🔍</Text>
          <TextInput
            placeholder="Search snippets..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 py-2 text-foreground"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text className="text-muted">✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          className={cn(
            "p-2 rounded-lg",
            showFilters ? "bg-primary" : "bg-surface border border-border"
          )}
        >
          <Text className={showFilters ? "text-background" : "text-foreground"}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View className="gap-3 pb-2">
          {/* Regex toggle */}
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-foreground">Regex Search</Text>
            <TouchableOpacity
              onPress={() => setUseRegex(!useRegex)}
              className={cn(
                "px-3 py-1 rounded-full",
                useRegex ? "bg-primary" : "bg-surface border border-border"
              )}
            >
              <Text className={cn("text-xs font-semibold", useRegex ? "text-background" : "text-foreground")}>
                {useRegex ? "ON" : "OFF"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Language filter */}
          {languages.length > 0 && (
            <View>
              <Text className="text-xs font-semibold text-muted mb-2">Language</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <TouchableOpacity
                  onPress={() => setFilterLanguage(null)}
                  className={cn(
                    "px-3 py-1 rounded-full",
                    filterLanguage === null ? "bg-primary" : "bg-surface border border-border"
                  )}
                >
                  <Text
                    className={cn(
                      "text-xs font-semibold",
                      filterLanguage === null ? "text-background" : "text-foreground"
                    )}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {languages.map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => setFilterLanguage(filterLanguage === lang ? null : lang)}
                    className={cn(
                      "px-3 py-1 rounded-full",
                      filterLanguage === lang ? "bg-primary" : "bg-surface border border-border"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-xs font-semibold",
                        filterLanguage === lang ? "text-background" : "text-foreground"
                      )}
                    >
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Favorite/Pinned filters */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setFilterFavorite(filterFavorite === true ? undefined : true)}
              className={cn(
                "flex-1 py-2 rounded-lg",
                filterFavorite === true ? "bg-primary" : "bg-surface border border-border"
              )}
            >
              <Text
                className={cn(
                  "text-center text-sm font-semibold",
                  filterFavorite === true ? "text-background" : "text-foreground"
                )}
              >
                ❤️ Favorites
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilterPinned(filterPinned === true ? undefined : true)}
              className={cn(
                "flex-1 py-2 rounded-lg",
                filterPinned === true ? "bg-primary" : "bg-surface border border-border"
              )}
            >
              <Text
                className={cn(
                  "text-center text-sm font-semibold",
                  filterPinned === true ? "text-background" : "text-foreground"
                )}
              >
                📌 Pinned
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderSidebar = () => (
    <View className="w-64 bg-surface border-r border-border">
      {/* Category Browser */}
      <View className="flex-1 border-b border-border">
        <View className="px-4 py-3 border-b border-border">
          <Text className="text-sm font-bold text-foreground">Categories</Text>
        </View>
        <CategoryBrowser
          selectedCategoryId={selectedCategory?.id}
          onSelectCategory={setSelectedCategory}
        />
      </View>

      {/* Collection Manager */}
      <View className="flex-1">
        <CollectionManager
          selectedCollectionId={selectedCollection?.id}
          onSelectCollection={setSelectedCollection}
        />
      </View>
    </View>
  );

  return (
    <ScreenContainer className="flex-row">
      {/* Mobile: Show sidebar in modal */}
      <Modal visible={showCategoryBrowser} transparent animationType="slide">
        <View className="flex-1 bg-background pt-12">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <Text className="text-lg font-bold text-foreground">Categories</Text>
            <TouchableOpacity onPress={() => setShowCategoryBrowser(false)}>
              <Text className="text-foreground text-lg">✕</Text>
            </TouchableOpacity>
          </View>
          <CategoryBrowser
            selectedCategoryId={selectedCategory?.id}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              setShowCategoryBrowser(false);
            }}
          />
        </View>
      </Modal>

      <Modal visible={showCollectionManager} transparent animationType="slide">
        <View className="flex-1 bg-background pt-12">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <Text className="text-lg font-bold text-foreground">Collections</Text>
            <TouchableOpacity onPress={() => setShowCollectionManager(false)}>
              <Text className="text-foreground text-lg">✕</Text>
            </TouchableOpacity>
          </View>
          <CollectionManager
            selectedCollectionId={selectedCollection?.id}
            onSelectCollection={(col) => {
              setSelectedCollection(col);
              setShowCollectionManager(false);
            }}
          />
        </View>
      </Modal>

      {/* Main content */}
      <View className="flex-1">
        {renderSearchBar()}

        {/* Quick access buttons */}
        <View className="flex-row gap-2 px-4 py-3 border-b border-border">
          <TouchableOpacity
            onPress={() => setShowCategoryBrowser(true)}
            className="flex-1 bg-surface border border-border rounded-lg py-2"
          >
            <Text className="text-center text-sm font-semibold text-foreground">
              📁 Categories
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowCollectionManager(true)}
            className="flex-1 bg-surface border border-border rounded-lg py-2"
          >
            <Text className="text-center text-sm font-semibold text-foreground">
              📚 Collections
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active filters display */}
        {(selectedCategory || selectedCollection || filterLanguage || filterFavorite || filterPinned) && (
          <View className="px-4 py-2 bg-surface/50 flex-row gap-2 flex-wrap">
            {selectedCategory && (
              <View className="bg-primary px-3 py-1 rounded-full flex-row items-center gap-1">
                <Text className="text-background text-xs font-semibold">{selectedCategory.name}</Text>
                <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                  <Text className="text-background text-xs">✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {selectedCollection && (
              <View className="bg-primary px-3 py-1 rounded-full flex-row items-center gap-1">
                <Text className="text-background text-xs font-semibold">{selectedCollection.name}</Text>
                <TouchableOpacity onPress={() => setSelectedCollection(null)}>
                  <Text className="text-background text-xs">✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {filterLanguage && (
              <View className="bg-primary px-3 py-1 rounded-full flex-row items-center gap-1">
                <Text className="text-background text-xs font-semibold">{filterLanguage}</Text>
                <TouchableOpacity onPress={() => setFilterLanguage(null)}>
                  <Text className="text-background text-xs">✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Snippets list */}
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SnippetCard snippet={item} />}
          contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 12, gap: 12 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-2xl mb-2">📭</Text>
              <Text className="text-foreground font-semibold mb-1">No snippets found</Text>
              <Text className="text-muted text-sm text-center px-4">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "Create your first snippet to get started"}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenContainer>
  );
}
