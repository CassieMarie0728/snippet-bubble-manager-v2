import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CloudSnippetInput } from "./cloud-sync";

const SYNC_QUEUE_KEY = "@snippet_bubbles_sync_queue_v1";
const SYNC_CURSOR_KEY = "@snippet_bubbles_sync_cursor_v1";

export type PendingSyncOperation = {
  operationId: string;
  entityType: "snippet";
  operationType: "upsert" | "delete";
  entityClientId: string;
  baseRevision: number;
  payload: CloudSnippetInput | Record<string, never>;
  createdAt: number;
  status: "pending" | "conflict";
};

function createOperationId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

async function writeQueue(queue: PendingSyncOperation[]) {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export async function readSyncQueue(): Promise<PendingSyncOperation[]> {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PendingSyncOperation =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as PendingSyncOperation).operationId === "string" &&
        typeof (item as PendingSyncOperation).entityClientId === "string" &&
        ((item as PendingSyncOperation).status === "pending" || (item as PendingSyncOperation).status === "conflict"),
    );
  } catch {
    return [];
  }
}

export async function enqueueSnippetUpsert(
  payload: CloudSnippetInput,
  baseRevision: number,
): Promise<PendingSyncOperation> {
  const queue = await readSyncQueue();
  const existingIndex = queue.findIndex(
    (operation) =>
      operation.status === "pending" &&
      operation.entityType === "snippet" &&
      operation.operationType === "upsert" &&
      operation.entityClientId === payload.clientId,
  );
  const operation: PendingSyncOperation = {
    operationId: existingIndex >= 0 ? queue[existingIndex].operationId : createOperationId(),
    entityType: "snippet",
    operationType: "upsert",
    entityClientId: payload.clientId,
    baseRevision: existingIndex >= 0 ? queue[existingIndex].baseRevision : baseRevision,
    payload,
    createdAt: existingIndex >= 0 ? queue[existingIndex].createdAt : Date.now(),
    status: "pending",
  };
  if (existingIndex >= 0) queue[existingIndex] = operation;
  else queue.push(operation);
  await writeQueue(queue);
  return operation;
}

export async function acknowledgeSyncOperations(operationIds: string[]) {
  const acknowledged = new Set(operationIds);
  const queue = await readSyncQueue();
  await writeQueue(queue.filter((operation) => !acknowledged.has(operation.operationId)));
}

export async function markSyncConflicts(operationIds: string[]) {
  const conflicted = new Set(operationIds);
  const queue = await readSyncQueue();
  await writeQueue(queue.map((operation) => (conflicted.has(operation.operationId) ? { ...operation, status: "conflict" } : operation)));
}

export async function readSyncCursor() {
  const value = await AsyncStorage.getItem(SYNC_CURSOR_KEY);
  const cursor = Number(value ?? 0);
  return Number.isInteger(cursor) && cursor >= 0 ? cursor : 0;
}

export async function writeSyncCursor(cursor: number) {
  await AsyncStorage.setItem(SYNC_CURSOR_KEY, String(cursor));
}
