import { useCallback, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { fromCloudSnippet, type CloudSnippet } from "@/lib/cloud-sync";
import { useSnippets } from "@/lib/snippet-context";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

type Revision = "local" | "cloud";
type ConflictPayload = Omit<CloudSnippet, "revision" | "deletedAt" | "createdAt" | "updatedAt"> & {
  revision?: number;
  deletedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function asConflictPayload(value: unknown): ConflictPayload | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Partial<ConflictPayload>;
  if (
    typeof payload.clientId !== "string" ||
    typeof payload.title !== "string" ||
    typeof payload.code !== "string" ||
    typeof payload.language !== "string" ||
    !Array.isArray(payload.tags)
  ) {
    return null;
  }
  return {
    clientId: payload.clientId,
    title: payload.title,
    code: payload.code,
    language: payload.language,
    description: typeof payload.description === "string" ? payload.description : "",
    tags: payload.tags.filter((tag): tag is string => typeof tag === "string"),
    categoryClientId: typeof payload.categoryClientId === "string" ? payload.categoryClientId : null,
    isFavorite: Boolean(payload.isFavorite),
    isPinned: Boolean(payload.isPinned),
    copyCount: typeof payload.copyCount === "number" ? payload.copyCount : 0,
    lastCopiedAt: payload.lastCopiedAt ?? null,
    revision: typeof payload.revision === "number" ? payload.revision : 0,
    deletedAt: payload.deletedAt ?? null,
    createdAt: payload.createdAt ?? new Date(),
    updatedAt: payload.updatedAt ?? new Date(),
  };
}

export default function SyncConflictsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { replaceSnippets } = useSnippets();
  const utils = trpc.useUtils();
  const conflictsQuery = trpc.sync.conflicts.useQuery(undefined, { retry: 1 });
  const resolveMutation = trpc.sync.resolve.useMutation();
  const [index, setIndex] = useState(0);
  const [selectedRevision, setSelectedRevision] = useState<Revision>("local");

  const conflicts = conflictsQuery.data ?? [];
  const currentIndex = Math.min(index, Math.max(conflicts.length - 1, 0));
  const conflict = conflicts[currentIndex];
  const localPayload = useMemo(() => asConflictPayload(conflict?.localPayload), [conflict]);
  const cloudPayload = useMemo(() => asConflictPayload(conflict?.serverPayload), [conflict]);
  const selectedPayload = selectedRevision === "local" ? localPayload : cloudPayload;

  const resolve = useCallback(
    (revision: Revision) => {
      const candidate = revision === "local" ? localPayload : cloudPayload;
      if (!conflict || !candidate || resolveMutation.isPending) return;
      const label = revision === "local" ? "your edit" : "the cloud edit";
      Alert.alert(
        "Choose this revision?",
        `Use ${label} for “${candidate.title}”? The other revision remains recorded with this resolved conflict for audit history.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Use This Revision",
            onPress: async () => {
              try {
                await resolveMutation.mutateAsync({
                  conflictId: conflict.id,
                  resolution: revision === "local" ? "local_wins" : "server_wins",
                });
                const remote = await utils.snippets.list.fetch();
                replaceSnippets(remote.map(fromCloudSnippet));
                await utils.sync.conflicts.invalidate();
                if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setSelectedRevision("local");
                setIndex((value) => Math.max(0, Math.min(value, Math.max(conflicts.length - 2, 0))));
              } catch (error) {
                const message = error instanceof Error ? error.message : "Could not save your choice. Your edits are still safe.";
                Alert.alert("Resolution Not Saved", message);
                if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
            },
          },
        ],
      );
    },
    [cloudPayload, conflict, conflicts.length, localPayload, replaceSnippets, resolveMutation, utils.snippets.list, utils.sync.conflicts],
  );

  if (conflictsQuery.isLoading) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centered}><Text style={{ color: colors.muted }}>Loading unresolved conflicts…</Text></View>
      </ScreenContainer>
    );
  }

  if (!conflict || !localPayload || !cloudPayload || !selectedPayload) {
    return (
      <ScreenContainer edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centered}>
          <IconSymbol name="checkmark" size={34} color={colors.success} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing waiting on you.</Text>
          <Text style={[styles.emptyCopy, { color: colors.muted }]}>There are no unresolved snippet conflicts to review.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back to Settings" onPress={() => router.back()} style={({ pressed }) => [styles.backCta, { backgroundColor: colors.primary }, pressed && { opacity: 0.9 }]}>
            <Text style={styles.backCtaText}>Back to Settings</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const isTruncated = selectedPayload.code.length > 20_000;
  const code = isTruncated ? `${selectedPayload.code.slice(0, 20_000)}\n\n… Preview limited to the first 20,000 characters. Your selected revision is saved in full.` : selectedPayload.code;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Settings" onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}>
          <IconSymbol name="arrow.left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>Resolve Conflicts</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{currentIndex + 1} of {conflicts.length} needs a choice</Text>
        </View>
        <View style={styles.iconSpacer} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.notice, { backgroundColor: colors.warning + "16", borderColor: colors.warning + "44" }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={18} color={colors.warning} />
          <Text style={[styles.noticeText, { color: colors.foreground }]}>Both revisions are preserved until you make an explicit choice.</Text>
        </View>

        <View style={[styles.switcher, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(["local", "cloud"] as const).map((revision) => {
            const active = selectedRevision === revision;
            return (
              <Pressable key={revision} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`Show ${revision === "local" ? "your edit" : "cloud edit"}`} onPress={() => setSelectedRevision(revision)} style={({ pressed }) => [styles.switchOption, active && { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}>
                <Text style={[styles.switchText, { color: active ? "#fff" : colors.muted }]}>{revision === "local" ? "Your Edit" : "Cloud Edit"}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.revisionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.revisionTopline}>
            <View style={[styles.badge, { backgroundColor: selectedRevision === "local" ? colors.primary + "22" : colors.warning + "22" }]}>
              <Text style={[styles.badgeText, { color: selectedRevision === "local" ? colors.primary : colors.warning }]}>{selectedRevision === "local" ? "YOUR EDIT" : "CLOUD EDIT"}</Text>
            </View>
            <Text style={[styles.language, { color: colors.muted }]}>{selectedPayload.language}</Text>
          </View>
          <Text style={[styles.snippetTitle, { color: colors.foreground }]}>{selectedPayload.title}</Text>
          {selectedPayload.description ? <Text style={[styles.description, { color: colors.muted }]}>{selectedPayload.description}</Text> : null}
          {selectedPayload.tags.length > 0 && <Text style={[styles.tags, { color: colors.primary }]}>{selectedPayload.tags.join("  ·  ")}</Text>}
          <View style={[styles.codeBlock, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text selectable style={[styles.code, { color: colors.foreground }]}>{code}</Text>
          </View>
        </View>

        {conflicts.length > 1 && (
          <View style={styles.pager}>
            <Pressable disabled={currentIndex === 0} onPress={() => setIndex((value) => Math.max(0, value - 1))} style={({ pressed }) => [styles.pagerButton, { borderColor: colors.border }, currentIndex === 0 && styles.disabled, pressed && { opacity: 0.7 }]}><Text style={{ color: colors.foreground }}>Previous</Text></Pressable>
            <Pressable disabled={currentIndex >= conflicts.length - 1} onPress={() => setIndex((value) => Math.min(conflicts.length - 1, value + 1))} style={({ pressed }) => [styles.pagerButton, { borderColor: colors.border }, currentIndex >= conflicts.length - 1 && styles.disabled, pressed && { opacity: 0.7 }]}><Text style={{ color: colors.foreground }}>Next</Text></Pressable>
          </View>
        )}
      </ScrollView>

      <View style={[styles.actionBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable disabled={resolveMutation.isPending} accessibilityRole="button" accessibilityLabel="Use your edit" onPress={() => resolve("local")} style={({ pressed }) => [styles.primaryAction, { backgroundColor: colors.primary }, resolveMutation.isPending && styles.disabled, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
          <Text style={styles.primaryActionText}>{resolveMutation.isPending ? "Saving Choice…" : "Use Your Edit"}</Text>
        </Pressable>
        <Pressable disabled={resolveMutation.isPending} accessibilityRole="button" accessibilityLabel="Use cloud edit" onPress={() => resolve("cloud")} style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.border }, resolveMutation.isPending && styles.disabled, pressed && { opacity: 0.75 }]}>
          <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Use Cloud Edit</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, borderBottomWidth: 0.5 },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }, iconSpacer: { width: 48 }, headerCopy: { flex: 1, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700" }, subtitle: { marginTop: 2, fontSize: 12 }, content: { padding: 16, paddingBottom: 152, gap: 16 },
  notice: { flexDirection: "row", gap: 10, padding: 14, borderWidth: 1, borderRadius: 12, alignItems: "flex-start" }, noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  switcher: { flexDirection: "row", padding: 4, borderWidth: 1, borderRadius: 12, gap: 4 }, switchOption: { flex: 1, minHeight: 48, borderRadius: 8, alignItems: "center", justifyContent: "center" }, switchText: { fontSize: 14, fontWeight: "700" },
  revisionCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 }, revisionTopline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }, badgeText: { fontSize: 11, fontWeight: "800" }, language: { fontSize: 13, fontWeight: "600" },
  snippetTitle: { fontSize: 22, lineHeight: 28, fontWeight: "700" }, description: { fontSize: 14, lineHeight: 20 }, tags: { fontSize: 12, fontWeight: "600" }, codeBlock: { borderWidth: 1, borderRadius: 10, padding: 12, maxHeight: 420 }, code: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), fontSize: 12, lineHeight: 18 },
  pager: { flexDirection: "row", gap: 12 }, pagerButton: { flex: 1, minHeight: 48, justifyContent: "center", alignItems: "center", borderWidth: 1, borderRadius: 10 },
  actionBar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 18, gap: 10, borderTopWidth: 0.5 }, primaryAction: { minHeight: 56, alignItems: "center", justifyContent: "center", borderRadius: 12 }, primaryActionText: { color: "#fff", fontSize: 16, fontWeight: "800" }, secondaryAction: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1 }, secondaryActionText: { fontSize: 15, fontWeight: "700" },
  emptyTitle: { fontSize: 20, fontWeight: "700" }, emptyCopy: { textAlign: "center", fontSize: 14, lineHeight: 20 }, backCta: { minHeight: 52, paddingHorizontal: 20, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8 }, backCtaText: { color: "#fff", fontWeight: "800" }, disabled: { opacity: 0.45 },
});
