import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/hooks/use-auth";
import { mergeCloudSnippets, toCloudSnippetInput, type SyncConflict } from "@/lib/cloud-sync";
import { useSnippets } from "@/lib/snippet-context";
import {
  acknowledgeSyncOperations,
  enqueueSnippetUpsert,
  markSyncConflicts,
  readSyncCursor,
  readSyncQueue,
  writeSyncCursor,
} from "@/lib/sync-queue";
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
  const syncPushMutation = trpc.sync.push.useMutation();
  const utils = trpc.useUtils();

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
      const initialRemote = await listQuery.refetch();
      if (initialRemote.error) throw initialRemote.error;
      const initialPlan = mergeCloudSnippets(snippetState.snippets, initialRemote.data ?? []);
      for (const snippet of initialPlan.upload) {
        await enqueueSnippetUpsert(toCloudSnippetInput(snippet), 0);
      }

      const pending = (await readSyncQueue()).filter((operation) => operation.status === "pending");
      const pushResult = pending.length
        ? await syncPushMutation.mutateAsync({ operations: pending.map(({ createdAt: _createdAt, status: _status, ...operation }) => operation) })
        : { results: [] };
      const acknowledgements = pushResult.results
        .filter((result) => result.status === "acknowledged")
        .map((result) => result.operationId);
      const conflictsFromPush = pushResult.results
        .filter((result) => result.status === "conflict")
        .map((result) => result.operationId);
      await acknowledgeSyncOperations(acknowledgements);
      await markSyncConflicts(conflictsFromPush);

      const cursor = await readSyncCursor();
      const pullResult = await utils.sync.pull.fetch({ cursor, limit: 50 });
      await writeSyncCursor(pullResult.nextCursor);

      const finalRemote = await listQuery.refetch();
      if (finalRemote.error) throw finalRemote.error;
      const finalPlan = mergeCloudSnippets(snippetState.snippets, finalRemote.data ?? []);
      replaceSnippets(finalPlan.merged);
      const now = Date.now();
      setLastSyncedAt(now);
      setConflicts(finalPlan.conflicts);
      await AsyncStorage.setItem(LAST_SYNC_KEY, String(now));
      return {
        uploaded: acknowledgements.length,
        downloaded: pullResult.changes.length,
        conflicts: finalPlan.conflicts.length + conflictsFromPush.length,
      };
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : "Cloud sync failed. Your local library is safe.";
      setError(message);
      return null;
    } finally {
      setSyncing(false);
    }
  }, [authLoading, isAuthenticated, listQuery, replaceSnippets, snippetState.loaded, snippetState.snippets, syncPushMutation, utils.sync.pull]);

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
