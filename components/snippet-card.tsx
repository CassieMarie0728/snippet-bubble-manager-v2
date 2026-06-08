import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Snippet } from "@/lib/types";
import { useSnippets } from "@/lib/snippet-context";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { CodeHighlighter } from "@/components/code-highlighter";
import { AISnippetExpansion } from "@/components/ai-snippet-expansion";
import { useState, useCallback } from "react";

interface SnippetCardProps {
  snippet: Snippet;
}

export function SnippetCard({ snippet }: SnippetCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { toggleFavorite, togglePin, markCopied, duplicateSnippet } = useSnippets();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(snippet.code);
    markCopied(snippet.id);
    setCopied(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTimeout(() => setCopied(false), 1500);
  }, [snippet.code, snippet.id, markCopied]);

  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/snippet/${snippet.id}` as any);
  }, [snippet.id, router]);

  const handleFavorite = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    toggleFavorite(snippet.id);
  }, [snippet.id, toggleFavorite]);

  const handlePin = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    togglePin(snippet.id);
  }, [snippet.id, togglePin]);

  const handleDuplicate = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    duplicateSnippet(snippet.id);
  }, [snippet.id, duplicateSnippet]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {snippet.isPinned && (
            <IconSymbol name="pin.fill" size={14} color={colors.primary} style={styles.pinIcon} />
          )}
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {snippet.title}
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={handleFavorite}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.5 }]}
          >
            <IconSymbol
              name="heart.fill"
              size={18}
              color={snippet.isFavorite ? colors.error : colors.muted}
            />
          </Pressable>
          <Pressable
            onPress={handlePin}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.5 }]}
          >
            <IconSymbol
              name="pin.fill"
              size={18}
              color={snippet.isPinned ? colors.primary : colors.muted}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.metaRow}>
        {snippet.language ? (
          <View style={[styles.langBadge, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.langText, { color: colors.primary }]}>{snippet.language}</Text>
          </View>
        ) : null}
        {snippet.tags.length > 0 && (
          <Text style={[styles.tags, { color: colors.muted }]} numberOfLines={1}>
            {snippet.tags.join(" · ")}
          </Text>
        )}
      </View>

      <View style={[styles.codeBlock, { backgroundColor: colors.background }]}>
        <CodeHighlighter
          code={snippet.code}
          language={snippet.language}
          maxLines={3}
          fontSize={11}
        />
      </View>

      {/* AI Expansion */}
      <AISnippetExpansion snippet={snippet} />

      <View style={styles.footer}>
        {snippet.description ? (
          <Text style={[styles.description, { color: colors.muted }]} numberOfLines={1}>
            {snippet.description}
          </Text>
        ) : (
          <View />
        )}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [
              styles.copyBtn,
              { backgroundColor: copied ? colors.success : colors.primary, flex: 1 },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <IconSymbol
              name={copied ? "checkmark" : "doc.on.doc.fill"}
              size={14}
              color="#fff"
            />
            <Text style={styles.copyText}>{copied ? "Copied!" : "Copy"}</Text>
          </Pressable>
          <Pressable
            onPress={handleDuplicate}
            style={({ pressed }) => [
              styles.copyBtn,
              { backgroundColor: colors.primary, flex: 1 },
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
            ]}
          >
            <IconSymbol
              name="doc.fill"
              size={14}
              color="#fff"
            />
            <Text style={styles.copyText}>Duplicate</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  pinIcon: {
    marginRight: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 4,
  },
  iconBtn: {
    padding: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  langBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  langText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tags: {
    fontSize: 12,
    flex: 1,
  },
  codeBlock: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  codeText: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 18,
  },
  description: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  copyText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
