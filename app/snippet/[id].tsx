import { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSnippets } from "@/lib/snippet-context";
import { useColors } from "@/hooks/use-colors";

export default function SnippetDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, toggleFavorite, togglePin, deleteSnippet, markCopied } = useSnippets();
  const [copied, setCopied] = useState(false);

  const snippet = useMemo(
    () => state.snippets.find((s) => s.id === id),
    [state.snippets, id]
  );

  const handleCopy = useCallback(async () => {
    if (!snippet) return;
    await Clipboard.setStringAsync(snippet.code);
    markCopied(snippet.id);
    setCopied(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTimeout(() => setCopied(false), 1500);
  }, [snippet, markCopied]);

  const handleEdit = useCallback(() => {
    if (!snippet) return;
    router.push(`/snippet/edit?id=${snippet.id}` as any);
  }, [snippet, router]);

  const handleDelete = useCallback(() => {
    if (!snippet) return;
    Alert.alert("Delete Snippet", "This is permanent. No take-backs.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteSnippet(snippet.id);
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          router.back();
        },
      },
    ]);
  }, [snippet, deleteSnippet, router]);

  const handleFavorite = useCallback(() => {
    if (!snippet) return;
    if (Platform.OS !== "web") Haptics.selectionAsync();
    toggleFavorite(snippet.id);
  }, [snippet, toggleFavorite]);

  const handlePin = useCallback(() => {
    if (!snippet) return;
    if (Platform.OS !== "web") Haptics.selectionAsync();
    togglePin(snippet.id);
  }, [snippet, togglePin]);

  if (!snippet) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.muted }]}>Snippet not found</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: colors.surface },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const formattedDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.5 }]}
        >
          <IconSymbol name="arrow.left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {snippet.title}
        </Text>
        <Pressable
          onPress={handleEdit}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.5 }]}
        >
          <IconSymbol name="pencil" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Meta badges */}
        <View style={styles.metaRow}>
          {snippet.language ? (
            <View style={[styles.badge, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>{snippet.language}</Text>
            </View>
          ) : null}
          {snippet.isPinned && (
            <View style={[styles.badge, { backgroundColor: colors.primary + "15" }]}>
              <IconSymbol name="pin.fill" size={12} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>Pinned</Text>
            </View>
          )}
          {snippet.isFavorite && (
            <View style={[styles.badge, { backgroundColor: colors.error + "15" }]}>
              <IconSymbol name="heart.fill" size={12} color={colors.error} />
              <Text style={[styles.badgeText, { color: colors.error }]}>Favorite</Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {snippet.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {snippet.tags.map((tag, i) => (
              <View key={i} style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.tagText, { color: colors.muted }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Description */}
        {snippet.description ? (
          <Text style={[styles.description, { color: colors.foreground }]}>
            {snippet.description}
          </Text>
        ) : null}

        {/* Code Block */}
        <View style={[styles.codeBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.codeHeader}>
            <Text style={[styles.codeLabel, { color: colors.muted }]}>
              {snippet.language || "Code"}
            </Text>
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [
                styles.codeCopyBtn,
                { backgroundColor: copied ? colors.success : colors.primary },
                pressed && { transform: [{ scale: 0.97 }] },
              ]}
            >
              <IconSymbol
                name={copied ? "checkmark" : "doc.on.doc.fill"}
                size={14}
                color="#fff"
              />
              <Text style={styles.codeCopyText}>{copied ? "Copied!" : "Copy"}</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text
              style={[
                styles.codeText,
                {
                  color: colors.foreground,
                  fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                },
              ]}
              selectable
            >
              {snippet.code}
            </Text>
          </ScrollView>
        </View>

        {/* Metadata */}
        <View style={[styles.metaSection, { borderTopColor: colors.border }]}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.muted }]}>Created</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>
              {formattedDate(snippet.createdAt)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.muted }]}>Updated</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>
              {formattedDate(snippet.updatedAt)}
            </Text>
          </View>
          {snippet.lastCopiedAt && (
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.muted }]}>Last Copied</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>
                {formattedDate(snippet.lastCopiedAt)}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.actionBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleCopy}
          style={({ pressed }) => [
            styles.primaryAction,
            { backgroundColor: copied ? colors.success : colors.primary },
            pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
          ]}
        >
          <IconSymbol name={copied ? "checkmark" : "doc.on.doc.fill"} size={18} color="#fff" />
          <Text style={styles.primaryActionText}>{copied ? "Copied!" : "Copy Code"}</Text>
        </Pressable>

        <View style={styles.secondaryActions}>
          <Pressable
            onPress={handleFavorite}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol
              name="heart.fill"
              size={20}
              color={snippet.isFavorite ? colors.error : colors.muted}
            />
          </Pressable>
          <Pressable
            onPress={handlePin}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol
              name="pin.fill"
              size={20}
              color={snippet.isPinned ? colors.primary : colors.muted}
            />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="trash.fill" size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  codeBlock: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  codeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  codeCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  codeCopyText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  codeText: {
    fontSize: 13,
    lineHeight: 20,
    padding: 14,
    paddingTop: 0,
  },
  metaSection: {
    borderTopWidth: 0.5,
    paddingTop: 16,
    gap: 8,
  },
  metaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: {
    fontSize: 13,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  notFoundText: {
    fontSize: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 0.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryActionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
