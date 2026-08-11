import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/hooks/use-auth";
import { mergeCloudSnippets, toCloudSnippetInput, type SyncConflict } from "@/lib/cloud-sync";
import { useSnippets } from "@/lib/snippet-context";
import { trpc } from "@/lib/trpc";

const LAST_SYNC_KEY = "@snippet_bubbles_last_cloud_sync";

export type CloudSyncState = {
  available: boolean;
  syncing: boolean;
  lastSyncedAt: number | null;
  conflicts: SyncConflict[];
  error: string | null;
};

type CloudSyncContextValue = CloudSyncState & {
  syncNow: () => Promise<{ uploaded: number; downloaded: number; conflicts: number } | null>;
};

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { state: snippetState, replaceSnippets } = useSnippets();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [error, setError] = useState<string | null>(null);
  const listQuery = trpc.snippets.list.useQuery(undefined, { enabled: false, retry: 1 });
  const upsertMutation = trpc.snippets.upsert.useMutation();

  useEffect(() => {
    AsyncStorage.getItem(LAST_SYNC_KEY)
      .then((value) => {
        const timestamp = value ? Number(value) : 0;
        if (Number.isFinite(timestamp) && timestamp > 0) setLastSyncedAt(timestamp);
      })
      .catch(() => {
        // A missing preference must never block a local-first library from loading.
      });
  }, []);

  const syncNow = useCallback(async () => {
    if (authLoading || !isAuthenticated) {
      setError("Sign in before syncing this device.");
      return null;
    }
    if (!snippetState.loaded) {
      setError("Your local library is still loading. Try again in a moment.");
      return null;
    }

    setSyncing(true);
    setError(null);
    try {
      const remoteResult = await listQuery.refetch();
      if (remoteResult.error) throw remoteResult.error;
      const plan = mergeCloudSnippets(snippetState.snippets, remoteResult.data ?? []);

      for (const snippet of plan.upload) {
        await upsertMutation.mutateAsync(toCloudSnippetInput(snippet));
      }

      replaceSnippets(plan.merged);
      const now = Date.now();
      setLastSyncedAt(now);
      setConflicts(plan.conflicts);
      await AsyncStorage.setItem(LAST_SYNC_KEY, String(now));
      return {
        uploaded: plan.upload.length,
        downloaded: plan.merged.length - snippetState.snippets.length + plan.upload.length,
        conflicts: plan.conflicts.length,
      };
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : "Cloud sync failed. Your local library is safe.";
      setError(message);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [authLoading, isAuthenticated, listQuery, replaceSnippets, snippetState.loaded, snippetState.snippets, upsertMutation]);

  const value = useMemo<CloudSyncContextValue>(
    () => ({
      available: isAuthenticated && !authLoading,
      syncing,
      lastSyncedAt,
      conflicts,
      error,
      syncNow,
    }),
    [authLoading, conflicts, error, isAuthenticated, lastSyncedAt, syncNow, syncing],
  );

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSync() {
  const context = useContext(CloudSyncContext);
  if (!context) throw new Error("useCloudSync must be used within CloudSyncProvider");
  return context;
}
