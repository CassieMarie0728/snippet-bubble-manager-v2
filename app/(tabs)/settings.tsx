import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  StyleSheet,
  Switch,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSnippets } from "@/lib/snippet-context";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import { AIPersonalitySettings } from "@/components/ai-personality-settings";
import { useCloudSync } from "@/lib/cloud-sync-context";
import { startOAuthLogin } from "@/constants/oauth";
import { parseSnippetImport, planSnippetImport, type DuplicateStrategy } from "@/lib/snippet-import";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/lib/toast-context";
import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import {
  canDrawOverlays,
  isFloatingBubbleSupported,
  requestOverlayPermission,
  stopFloatingBubble,
} from "@/modules/floating-bubble/src/FloatingBubble";

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, updateSettings, replaceSnippets } = useSnippets();
  const { settings, snippets } = state;
  const { themeMode, setThemeMode } = useThemeContext();
  const { showToast } = useToast();
  const { available: cloudSyncAvailable, syncing, lastSyncedAt, conflicts, error: cloudSyncError, syncNow } = useCloudSync();
  const [showAISettings, setShowAISettings] = useState(false);
  const [showAIPrivacy, setShowAIPrivacy] = useState(false);
  const aiQuotaQuery = trpc.ai.quota.useQuery(undefined, { staleTime: 60_000, retry: 1 });
  const syncConflictsQuery = trpc.sync.conflicts.useQuery(undefined, {
    enabled: cloudSyncAvailable,
    staleTime: 30_000,
    retry: 1,
  });
  const aiQuota = aiQuotaQuery.data;
  const unresolvedConflictCount = syncConflictsQuery.data?.length ?? 0;

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

  const handleBubbleEnabled = useCallback(
    async (value: boolean) => {
      if (!value) {
        updateSettings({ bubbleEnabled: false });
        await stopFloatingBubble();
        showToast({ title: "Floating bubble off", message: "The overlay is no longer shown above other apps." });
        return;
      }

      if (Platform.OS !== "android" || !isFloatingBubbleSupported()) {
        Alert.alert("Android overlay required", "The floating bubble is available in the Android preview/release build, not Expo Go or web.");
        return;
      }

      let allowed = await canDrawOverlays();
      if (!allowed) {
        await requestOverlayPermission();
        Alert.alert("Permission needed", "Enable Display over other apps for Snippet Bubbles, then return here and enable the bubble again.");
        return;
      }

      updateSettings({ bubbleEnabled: true });
      if (settings.hapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showToast({ title: "Floating bubble enabled", message: "Drag the bubble anywhere. Tap it to expand the snippet panel." });
    },
    [settings.hapticFeedback, showToast, updateSettings],
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
        if (typeof document === "undefined") {
          await Clipboard.setStringAsync(json);
          showToast({ title: "JSON copied", message: `${snippets.length} snippets are on your clipboard.` });
          return;
        }
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `snippet-bubbles-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showToast({ title: "JSON file downloaded", message: `${snippets.length} snippets are ready to keep or share.` });
        return;
      }

      const cacheDirectory = FileSystem.cacheDirectory;
      if (!cacheDirectory) throw new Error("Temporary storage is unavailable on this device.");
      const fileUri = `${cacheDirectory}snippet-bubbles-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Your device cannot open the system sharing panel for this JSON file.");
      }
      await Sharing.shareAsync(fileUri, {
        dialogTitle: "Export Snippet Bubbles JSON",
        mimeType: "application/json",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({ title: "JSON file ready", message: `${snippets.length} snippets were exported to a .json file.` });
    } catch (error) {
      await Clipboard.setStringAsync(json);
      const message = error instanceof Error ? error.message : "The JSON was copied to your clipboard instead.";
      showToast({ title: "Export copied to clipboard", message, tone: "info" });
    }
  }, [showToast, snippets]);

  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/json", "text/plain", "application/octet-stream"],
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
        const changed = plan.imported + plan.replaced + plan.copied;
        showToast({
          title: "Import complete",
          message: `${changed} snippet${changed === 1 ? "" : "s"} added or updated.`,
        });
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
      showToast({ title: "Import failed", message: "Choose a valid Snippet Bubbles .json file and try again.", tone: "error" });
    }
  }, [replaceSnippets, showToast, snippets]);

  const handleCloudSync = useCallback(async () => {
    const result = await syncNow();
    if (!result) return;
    const conflictNote = result.conflicts
      ? ` ${result.conflicts} conflict${result.conflicts === 1 ? " needs" : "s need"} your review before a winner is chosen.`
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

  const bubbleSizes: ("small" | "medium" | "large")[] = ["small", "medium", "large"];
  const defaultViews: ("pinned" | "recent")[] = ["pinned", "recent"];

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
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Floating Bubble</Text>
              <Text style={[styles.rowValue, { color: colors.muted }]}>Android overlay above other apps</Text>
            </View>
            <Switch
              value={settings.bubbleEnabled}
              onValueChange={handleBubbleEnabled}
              trackColor={{ false: colors.border, true: colors.primary + "88" }}
              thumbColor={settings.bubbleEnabled ? colors.primary : colors.muted}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
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
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>AI Usage</Text>
            <Text style={[styles.rowValue, { color: aiQuota?.hourly.remaining === 0 ? colors.warning : colors.primary }]}> 
              {aiQuota
                ? `${aiQuota.hourly.used}/${aiQuota.hourly.limit} this hour`
                : aiQuotaQuery.isLoading
                  ? "Checking…"
                  : "Unavailable"}
            </Text>
          </View>
          {aiQuota && (
            <Text style={[styles.aiUsageMeta, { color: colors.muted }]}> 
              {aiQuota.daily.used}/{aiQuota.daily.limit} today. Resets {new Date(aiQuota.hourly.resetsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
            </Text>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable
            onPress={() => setShowAISettings(!showAISettings)}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="sparkles" size={18} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>
              {showAISettings ? "Hide AI Settings" : "Customize AI Personality"}
            </Text>
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showAIPrivacy }}
            accessibilityLabel="Show AI data use and privacy details"
            onPress={() => setShowAIPrivacy(!showAIPrivacy)}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="hand.raised.fill" size={18} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}> 
              {showAIPrivacy ? "Hide AI Data Use Details" : "AI Data Use & Privacy"}
            </Text>
          </Pressable>
          {showAIPrivacy && (
            <View style={[styles.aiPrivacyNotice, { borderTopColor: colors.border }]}> 
              <Text style={[styles.aiPrivacyTitle, { color: colors.foreground }]}>What the AI receives</Text>
              <Text style={[styles.aiPrivacyCopy, { color: colors.muted }]}> 
                When you use an AI action, the prompt, code or snippet text you include, and AI personality instructions are sent to the built-in AI service to produce your response. Don’t send passwords, API keys, or personal information.
              </Text>
              <Text style={[styles.aiPrivacyTitle, { color: colors.foreground }]}>What we retain</Text>
              <Text style={[styles.aiPrivacyCopy, { color: colors.muted }]}> 
                We retain only privacy-safe operational metadata for reliability and abuse protection: action type, time, character counts, response size, outcome, duration, and quota window. We do not retain your prompt, code, snippet contents, or raw IP address in this telemetry.
              </Text>
              <Text style={[styles.aiPrivacyCopy, { color: colors.muted }]}> 
                AI use is limited per signed-in account. Before sign-in, a smaller temporary limit applies to an anonymized connection identifier.
              </Text>
            </View>
          )}
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

          {unresolvedConflictCount > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Review ${unresolvedConflictCount} unresolved sync conflict${unresolvedConflictCount === 1 ? "" : "s"}`}
                onPress={() => router.push("/sync-conflicts" as any)}
                style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.7 }]}
              >
                <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.warning} />
                <View style={styles.actionTextGroup}>
                  <Text style={[styles.actionText, { color: colors.warning }]}>Review Sync Conflicts</Text>
                  <Text style={[styles.actionDetail, { color: colors.muted }]}>Choose your edit or the cloud edit.</Text>
                </View>
                <Text style={[styles.conflictBadge, { backgroundColor: colors.warning + "22", color: colors.warning }]}>
                  {unresolvedConflictCount}
                </Text>
              </Pressable>
            </>
          )}

          {(lastSyncedAt || cloudSyncError || conflicts.length > 0 || unresolvedConflictCount > 0) && (
            <Text style={[styles.syncMeta, { color: cloudSyncError ? colors.error : colors.muted }]}> 
              {cloudSyncError
                ? cloudSyncError
                : unresolvedConflictCount > 0
                  ? `${unresolvedConflictCount} conflict${unresolvedConflictCount === 1 ? " is" : "s are"} waiting for your choice.`
                  : conflicts.length > 0
                    ? `${conflicts.length} new conflict${conflicts.length === 1 ? " was" : "s were"} detected. Refresh or review when ready.`
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
  actionText: { fontSize: 14, fontWeight: "600" },
  actionTextGroup: { flex: 1, gap: 2 },
  actionDetail: { fontSize: 12, lineHeight: 16 },
  conflictBadge: { minWidth: 28, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, textAlign: "center", fontSize: 12, fontWeight: "700" },
  disabledAction: {
    opacity: 0.5,
  },
  syncMeta: {
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  aiUsageMeta: {
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  aiPrivacyNotice: {
    borderTopWidth: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 8,
  },
  aiPrivacyTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  aiPrivacyCopy: {
    fontSize: 13,
    lineHeight: 19,
  },
});
