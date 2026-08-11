import { useCallback, useMemo } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { SnippetCard } from "@/components/snippet-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSnippets } from "@/lib/snippet-context";
import { useColors } from "@/hooks/use-colors";
import type { Snippet } from "@/lib/types";

export default function FavoritesScreen() {
  const colors = useColors();
  const { state, getFavorites } = useSnippets();

  const favorites = useMemo(() => getFavorites(), [getFavorites]);

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
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Favorites</Text>
          <Text style={[styles.countBadge, { color: colors.muted }]}>
            {favorites.length}
          </Text>
        </View>

        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="heart.fill" size={48} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No favorites yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                Heart a snippet to see it here
              </Text>
            </View>
          }
        />
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
    paddingBottom: 16,
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
});
