import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Platform,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { SnippetCard } from "@/components/snippet-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSnippets } from "@/lib/snippet-context";
import { useColors } from "@/hooks/use-colors";
import type { FilterType, Snippet } from "@/lib/types";

export default function LibraryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, searchSnippets, getSortedSnippets, getLanguages } = useSnippets();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const languages = useMemo(() => getLanguages(), [getLanguages]);

  const filteredSnippets = useMemo(() => {
    let results: Snippet[];
    if (query.trim()) {
      results = searchSnippets(query);
    } else {
      results = getSortedSnippets();
    }

    if (activeFilter === "pinned") {
      results = results.filter((s) => s.isPinned);
    } else if (activeFilter === "recent") {
      results = [...results].sort((a, b) => (b.lastCopiedAt ?? 0) - (a.lastCopiedAt ?? 0));
    } else if (activeFilter !== "all") {
      results = results.filter(
        (s) => s.language.toLowerCase() === activeFilter.toLowerCase()
      );
    }
    return results;
  }, [query, activeFilter, searchSnippets, getSortedSnippets]);

  const filters: { key: FilterType; label: string }[] = useMemo(
    () => [
      { key: "all", label: "All" },
      { key: "pinned", label: "Pinned" },
      { key: "recent", label: "Recent" },
      ...languages.map((l) => ({ key: l as FilterType, label: l })),
    ],
    [languages]
  );

  const handleAdd = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/snippet/edit" as any);
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: Snippet }) => <SnippetCard snippet={item} />,
    []
  );

  const keyExtractor = useCallback((item: Snippet) => item.id, []);

  if (!state.loaded) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted text-base">Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Snippets</Text>
          <Text style={[styles.countBadge, { color: colors.muted }]}>
            {state.snippets.length}
          </Text>
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search snippets..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="done"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              style={({ pressed }) => [pressed && { opacity: 0.5 }]}
            >
              <IconSymbol name="xmark" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipContainer}
        >
          {filters.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  setActiveFilter(f.key);
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                }}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isActive ? "#fff" : colors.muted },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Snippet List */}
        <FlatList
          data={filteredSnippets}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol
                name="chevron.left.forwardslash.chevron.right"
                size={48}
                color={colors.border}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {query ? "No results found" : "No snippets yet"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                {query
                  ? "Try a different search term"
                  : "Tap the + button to add your first snippet"}
              </Text>
            </View>
          }
        />

        {/* FAB */}
        <Pressable
          onPress={handleAdd}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 },
          ]}
        >
          <IconSymbol name="plus" size={28} color="#fff" />
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  countBadge: {
    fontSize: 16,
    fontWeight: "500",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  chipScroll: {
    maxHeight: 40,
    marginBottom: 12,
  },
  chipContainer: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
