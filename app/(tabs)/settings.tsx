import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  StyleSheet,
  Switch,
  Share,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSnippets } from "@/lib/snippet-context";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import { AIPersonalitySettings } from "@/components/ai-personality-settings";
import { useCloudSync } from "@/lib/cloud-sync-context";
import { startOAuthLogin } from "@/constants/oauth";
import { parseSnippetImport, planSnippetImport, type DuplicateStrategy } from "@/lib/snippet-import";
import { useCallback, useState } from "react";

export default function SettingsScreen() {
  const colors = useColors();
  const { state, updateSettings, replaceSnippets } = useSnippets();
  const { settings, snippets } = state;
  const { themeMode, setThemeMode } = useThemeContext();
  const { available: cloudSyncAvailable, syncing, lastSyncedAt, conflicts, error: cloudSyncError, syncNow } = useCloudSync();
  const [showAISettings, setShowAISettings] = useState(false);

  const handleThemeModeChange = useCallback(
    async (mode: "system" | "light" | "dark") => {
      await setThemeMode(mode);
      if (Platform.OS !== "web" && settings.hapticFeedback) {
        Haptics.selectionAsync();
      }
    },
    [setThemeMode, settings.hapticFeedback]
  );

  const handleToggle = useCallback(
    (key: "snapToEdge" | "hapticFeedback", value: boolean) => {
      updateSettings({ [key]: value });
      if (Platform.OS !== "web" && settings.hapticFeedback) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    [updateSettings, settings.hapticFeedback]
  );

  const handleBubbleSize = useCallback(
    (size: "small" | "medium" | "large") => {
      updateSettings({ bubbleSize: size });
      if (Platform.OS !== "web" && settings.hapticFeedback) {
        Haptics.selectionAsync();
      }
    },
    [updateSettings, settings.hapticFeedback]
  );

  const handleDefaultView = useCallback(
    (view: "pinned" | "recent") => {
      updateSettings({ defaultView: view });
      if (Platform.OS !== "web" && settings.hapticFeedback) {
        Haptics.selectionAsync();
      }
    },
    [updateSettings, settings.hapticFeedback]
  );

  const handleExport = useCallback(async () => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      snippets: snippets.map((s) => ({
        title: s.title,
        code: s.code,
        language: s.language,
        description: s.description,
        tags: s.tags,
        isFavorite: s.isFavorite,
        isPinned: s.isPinned,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    };
    const json = JSON.stringify(exportData, null, 2);

    try {
      if (Platform.OS === "web") {
        await Clipboard.setStringAsync(json);
        Alert.alert("Exported", `${snippets.length} snippets copied to clipboard as JSON.`);
      } else {
        await Share.share({
          message: json,
          title: "Snippet Bubble Manager Export",
        });
      }
    } catch (e) {
      // Fallback: copy to clipboard
      await Clipboard.setStringAsync(json);
      Alert.alert("Exported", `${snippets.length} snippets copied to clipboard as JSON.`);
    }
  }, [snippets]);

  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/json"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > 10 * 1024 * 1024) {
        Alert.alert("File Too Large", "Imports are limited to 10 MB to protect your local library.");
        return;
      }
      const text =
        Platform.OS === "web" && asset.file
          ? await asset.file.text()
          : await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = parseSnippetImport(JSON.parse(text));
      if (!parsed.snippets.length) {
        Alert.alert(
          "Nothing Imported",
          parsed.rejected[0]?.reason ?? "This file did not contain valid snippets.",
        );
        return;
      }
      const applyImport = (strategy: DuplicateStrategy) => {
        const plan = planSnippetImport(snippets, parsed, strategy);
        replaceSnippets(plan.snippets);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const recovery = plan.rejected.length ? ` ${plan.rejected.length} invalid record${plan.rejected.length === 1 ? " was" : "s were"} safely skipped.` : "";
        Alert.alert(
          "Import Complete",
          `${plan.imported} added, ${plan.replaced} replaced, ${plan.copied} copied, ${plan.skipped} duplicate${plan.skipped === 1 ? "" : "s"} skipped.${recovery}`,
        );
      };
      Alert.alert(
        "Import Snippets",
        `${parsed.snippets.length} valid snippet${parsed.snippets.length === 1 ? "" : "s"} found. How should duplicate code be handled?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Skip Duplicates", onPress: () => applyImport("skip") },
          { text: "Keep Both", onPress: () => applyImport("copy") },
          { text: "Replace Matches", style: "destructive", onPress: () => applyImport("replace") },
        ],
      );
    } catch {
      Alert.alert("Import Failed", "Could not read this JSON file. Your current library was not changed.");
    }
  }, [replaceSnippets, snippets]);

  const handleCloudSync = useCallback(async () => {
    const result = await syncNow();
    if (!result) return;
    const conflictNote = result.conflicts
      ? ` ${result.conflicts} timestamp conflict${result.conflicts === 1 ? " was" : "s were"} resolved safely.`
      : "";
    Alert.alert(
      "Cloud Sync Complete",
      `${result.uploaded} local snippet${result.uploaded === 1 ? " was" : "s were"} backed up.${conflictNote}`,
    );
  }, [syncNow]);

  const handleCloudSignIn = useCallback(async () => {
    try {
      await startOAuthLogin();
    } catch {
      Alert.alert("Sign-in Unavailable", "Could not open the secure sign-in flow. Please try again shortly.");
    }
  }, []);

  const bubbleSizes: Array<"small" | "medium" | "large"> = ["small", "medium", "large"];
  const defaultViews: Array<"pinned" | "recent"> = ["pinned", "recent"];

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Settings</Text>

        {/* Overlay Section */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>OVERLAY</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Bubble Size</Text>
            <View style={styles.segmentControl}>
              {bubbleSizes.map((size) => (
                <Pressable
                  key={size}
                  onPress={() => handleBubbleSize(size)}
                  style={({ pressed }) => [
                    styles.segment,
                    {
                      backgroundColor:
                        settings.bubbleSize === size ? colors.primary : "transparent",
                      borderColor: colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: settings.bubbleSize === size ? "#fff" : colors.muted,
                        fontWeight: settings.bubbleSize === size ? "600" : "400",
                      },
                    ]}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Snap to Edge</Text>
            <Switch
              value={settings.snapToEdge}
              onValueChange={(v) => handleToggle("snapToEdge", v)}
              trackColor={{ false: colors.border, true: colors.primary + "88" }}
              thumbColor={settings.snapToEdge ? colors.primary : colors.muted}
            />
          </View>
        </View>

        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>APPEARANCE</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Theme</Text>
            <View style={styles.segmentControl}>
              {[
                { label: "System", value: "system" },
                { label: "Light", value: "light" },
                { label: "Dark", value: "dark" },
              ].map((theme) => (
                <Pressable
                  key={theme.value}
                  onPress={() => handleThemeModeChange(theme.value as "system" | "light" | "dark")}
                  style={({ pressed }) => [
                    styles.segment,
                    {
                      backgroundColor:
                        themeMode === theme.value ? colors.primary : "transparent",
                      borderColor: colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: themeMode === theme.value ? "#fff" : colors.muted,
                        fontWeight: themeMode === theme.value ? "600" : "400",
                      },
                    ]}
                  >
                    {theme.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* AI Personality Section */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>AI ASSISTANT</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            onPress={() => setShowAISettings(!showAISettings)}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="sparkles" size={18} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>
              {showAISettings ? "Hide AI Settings" : "Customize AI Personality"}
            </Text>
          </Pressable>
        </View>
        {showAISettings && <AIPersonalitySettings />}

        {/* Behavior Section */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>BEHAVIOR</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Default View</Text>
            <View style={styles.segmentControl}>
              {defaultViews.map((view) => (
                <Pressable
                  key={view}
                  onPress={() => handleDefaultView(view)}
                  style={({ pressed }) => [
                    styles.segment,
                    {
                      backgroundColor:
                        settings.defaultView === view ? colors.primary : "transparent",
                      borderColor: colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: settings.defaultView === view ? "#fff" : colors.muted,
                        fontWeight: settings.defaultView === view ? "600" : "400",
                      },
                    ]}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Haptic Feedback</Text>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={(v) => handleToggle("hapticFeedback", v)}
              trackColor={{ false: colors.border, true: colors.primary + "88" }}
              thumbColor={settings.hapticFeedback ? colors.primary : colors.muted}
            />
          </View>
        </View>

        {/* Cloud Sync Section */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>CLOUD SYNC</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Device Backup</Text>
            <Text style={[styles.rowValue, { color: cloudSyncAvailable ? colors.success : colors.muted }]}>
              {syncing ? "Syncing…" : cloudSyncAvailable ? "Ready" : "Sign in required"}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {!cloudSyncAvailable && (
            <>
              <Pressable
                onPress={handleCloudSignIn}
                style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
              >
                <IconSymbol name="person.crop.circle.badge.plus" size={18} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Sign In to Enable Backup</Text>
              </Pressable>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          )}

          <Pressable
            disabled={!cloudSyncAvailable || syncing}
            onPress={handleCloudSync}
            style={({ pressed }) => [
              styles.actionRow,
              (!cloudSyncAvailable || syncing) && styles.disabledAction,
              pressed && { opacity: 0.7 },
            ]}
          >
            <IconSymbol name="arrow.triangle.2.circlepath" size={18} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>
              {syncing ? "Syncing Your Library…" : "Sync This Device"}
            </Text>
          </Pressable>

          {(lastSyncedAt || cloudSyncError || conflicts.length > 0) && (
            <Text style={[styles.syncMeta, { color: cloudSyncError ? colors.error : colors.muted }]}>
              {cloudSyncError
                ? cloudSyncError
                : conflicts.length > 0
                  ? `${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"} resolved by latest edit time.`
                  : `Last synced ${new Date(lastSyncedAt!).toLocaleString()}`}
            </Text>
          )}
        </View>

        {/* Data Section */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>DATA</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Total Snippets</Text>
            <Text style={[styles.rowValue, { color: colors.primary }]}>{snippets.length}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Pressable
            onPress={handleExport}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="square.and.arrow.up" size={18} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Export Snippets</Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Pressable
            onPress={handleImport}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="square.and.arrow.down" size={18} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Import JSON File</Text>
          </Pressable>
        </View>

        {/* About Section */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>ABOUT</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Version</Text>
            <Text style={[styles.rowValue, { color: colors.muted }]}>1.0.0</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Built by</Text>
            <Text style={[styles.rowValue, { color: colors.muted }]}>Cassie</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    paddingTop: 8,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
    paddingLeft: 4,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    height: 0.5,
    marginLeft: 16,
  },
  segmentControl: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 0.5,
  },
  segmentText: {
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "500",
  },
  disabledAction: {
    opacity: 0.5,
  },
  syncMeta: {
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
});
