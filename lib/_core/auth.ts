import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/oauth";
import { notifyAuthChanged } from "@/lib/auth-events";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
};

export async function getSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return null;
    }
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      return;
    }
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    notifyAuthChanged();
  } catch {
    throw new Error("Unable to securely store the session token.");
  }
}

export async function removeSessionToken(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      return;
    }
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    notifyAuthChanged();
  } catch {
    // Logout must remain best-effort even if secure storage is unavailable.
  }
}

export async function getUserInfo(): Promise<User | null> {
  try {
    if (Platform.OS === "web") {
      return null;
    }
    const info = await SecureStore.getItemAsync(USER_INFO_KEY);
    if (!info) {
      return null;
    }
    return JSON.parse(info);
  } catch {
    return null;
  }
}

export async function setUserInfo(user: User): Promise<void> {
  try {
    if (Platform.OS === "web") {
      return;
    }
    await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));
    notifyAuthChanged();
  } catch {
    // The authenticated server session remains the source of truth.
  }
}

export async function clearUserInfo(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.removeItem(USER_INFO_KEY);
      notifyAuthChanged();
      return;
    }
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
    notifyAuthChanged();
  } catch {
    // Clearing a stale cache must not block logout.
  }
}
