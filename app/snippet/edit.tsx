import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSnippets } from "@/lib/snippet-context";
import { useColors } from "@/hooks/use-colors";
import { LANGUAGES } from "@/lib/types";
import { useToast } from "@/lib/toast-context";

export default function SnippetEditScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { addSnippet, updateSnippet, deleteSnippet, getSnippetById } = useSnippets();
  const { showToast } = useToast();

  const isEditing = !!params.id;
  const existing = isEditing ? getSnippetById(params.id!) : undefined;

  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setCode(existing.code);
      setLanguage(existing.language);
      setDescription(existing.description);
      setTagsText(existing.tags.join(", "));
      setIsFavorite(existing.isFavorite);
      setIsPinned(existing.isPinned);
    }
  }, [existing]);

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Give your snippet a name.");
      return;
    }
    if (!code.trim()) {
      Alert.alert("Missing Code", "A snippet without code is just... nothing.");
      return;
    }

    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const input = {
      title: title.trim(),
      code: code,
      language: language.trim(),
      description: description.trim(),
      tags,
      isFavorite,
      isPinned,
    };

    if (isEditing && params.id) {
      updateSnippet(params.id, input);
    } else {
      addSnippet(input);
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    showToast({
      title: isEditing ? "Snippet updated" : "Snippet saved",
      message: isEditing ? "Your changes are safely in the library." : "Your new snippet is ready to use.",
    });
    router.back();
  }, [title, code, language, description, tagsText, isFavorite, isPinned, isEditing, params.id, addSnippet, updateSnippet, router, showToast]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Snippet",
      "This is permanent. No take-backs.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (params.id) {
              deleteSnippet(params.id);
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              router.back();
              // If we came from detail, go back again
              setTimeout(() => {
                if (router.canGoBack()) router.back();
              }, 100);
            }
          },
        },
      ]
    );
  }, [params.id, deleteSnippet, router]);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
          >
            <IconSymbol name="xmark" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {isEditing ? "Edit Snippet" : "New Snippet"}
          </Text>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={[styles.label, { color: colors.muted }]}>Title *</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Retrofit GET Template"
            placeholderTextColor={colors.muted}
            returnKeyType="next"
          />

          {/* Language */}
          <Text style={[styles.label, { color: colors.muted }]}>Language</Text>
          <Pressable
            onPress={() => setShowLangPicker(!showLangPicker)}
            style={({ pressed }) => [
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ color: language ? colors.foreground : colors.muted, fontSize: 15 }}>
              {language || "Select language..."}
            </Text>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </Pressable>
          {showLangPicker && (
            <View style={[styles.langGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang}
                  onPress={() => {
                    setLanguage(lang);
                    setShowLangPicker(false);
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                  }}
                  style={({ pressed }) => [
                    styles.langOption,
                    {
                      backgroundColor: language === lang ? colors.primary + "22" : "transparent",
                      borderColor: language === lang ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={{
                      color: language === lang ? colors.primary : colors.foreground,
                      fontSize: 13,
                      fontWeight: language === lang ? "600" : "400",
                    }}
                  >
                    {lang}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Tags */}
          <Text style={[styles.label, { color: colors.muted }]}>Tags (comma separated)</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={tagsText}
            onChangeText={setTagsText}
            placeholder="e.g., api, network, auth"
            placeholderTextColor={colors.muted}
            returnKeyType="next"
            autoCapitalize="none"
          />

          {/* Description */}
          <Text style={[styles.label, { color: colors.muted }]}>Description</Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional short explanation..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Code */}
          <Text style={[styles.label, { color: colors.muted }]}>Code *</Text>
          <TextInput
            style={[
              styles.input,
              styles.codeInput,
              {
                color: colors.foreground,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
              },
            ]}
            value={code}
            onChangeText={setCode}
            placeholder="Paste your code here..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Toggles */}
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => {
                setIsFavorite(!isFavorite);
                if (Platform.OS !== "web") Haptics.selectionAsync();
              }}
              style={({ pressed }) => [
                styles.toggle,
                {
                  backgroundColor: isFavorite ? colors.error + "18" : colors.surface,
                  borderColor: isFavorite ? colors.error : colors.border,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol
                name="heart.fill"
                size={18}
                color={isFavorite ? colors.error : colors.muted}
              />
              <Text
                style={{
                  color: isFavorite ? colors.error : colors.muted,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                Favorite
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setIsPinned(!isPinned);
                if (Platform.OS !== "web") Haptics.selectionAsync();
              }}
              style={({ pressed }) => [
                styles.toggle,
                {
                  backgroundColor: isPinned ? colors.primary + "18" : colors.surface,
                  borderColor: isPinned ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <IconSymbol
                name="pin.fill"
                size={18}
                color={isPinned ? colors.primary : colors.muted}
              />
              <Text
                style={{
                  color: isPinned ? colors.primary : colors.muted,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                Pinned
              </Text>
            </Pressable>
          </View>

          {/* Delete button (edit mode only) */}
          {isEditing && (
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.deleteBtn,
                { borderColor: colors.error },
                pressed && { opacity: 0.7, backgroundColor: colors.error + "12" },
              ]}
            >
              <IconSymbol name="trash.fill" size={18} color={colors.error} />
              <Text style={[styles.deleteBtnText, { color: colors.error }]}>Delete Snippet</Text>
            </Pressable>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  formContent: {
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  multiline: {
    minHeight: 80,
    paddingTop: 12,
  },
  codeInput: {
    minHeight: 160,
    fontSize: 13,
    lineHeight: 20,
    paddingTop: 12,
  },
  langGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 8,
  },
  langOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
