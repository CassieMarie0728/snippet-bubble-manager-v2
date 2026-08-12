import * as Linking from "expo-linking";
import * as ReactNative from "react-native";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";

// Extract scheme from bundle ID (last segment timestamp, prefixed with "manus")
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const bundleId = "space.manus.snippet.bubble.manager.t20260327210406";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
    "",
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;

/**
 * Get the API base URL, deriving from current hostname if not set.
 * Metro runs on 8081, API server runs on 3000.
 * URL pattern: https://PORT-sandboxid.region.domain
 */
export function getApiBaseUrl(): string {
  // If API_BASE_URL is set, use it
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  // On web, derive from current hostname by replacing port 8081 with 3000
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    // Pattern: 8081-sandboxid.region.domain -> 3000-sandboxid.region.domain
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }

  // Fallback to empty (will use relative URL)
  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

const encodeState = (value: string) => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) {
    return BufferImpl.from(value, "utf-8").toString("base64");
  }
  return value;
};

/**
 * Get the redirect URI for OAuth callback.
 * - Web: uses API server callback endpoint
 * - Native: uses deep link scheme
 */
export const getRedirectUri = () => {
  if (ReactNative.Platform.OS === "web") {
    return `${getApiBaseUrl()}/api/oauth/callback`;
  } else {
    return Linking.createURL("/oauth/callback", {
      scheme: env.deepLinkScheme,
    });
  }
};

export const getLoginUrl = () => {
  const redirectUri = getRedirectUri();
  const state = encodeState(redirectUri);
  const portal = OAUTH_PORTAL_URL || "https://manus.im";

  const url = new URL("/app-auth", portal);
  if (APP_ID) url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

export async function getServerLoginUrl(): Promise<string> {
  const redirectUri = getRedirectUri();
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return getLoginUrl();
  }

  const url = `${baseUrl}/api/oauth/login-url?${new URLSearchParams({ redirectUri }).toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Sign-in service unavailable (${response.status}).`);
  }
  const payload = (await response.json()) as { url?: string };
  if (!payload.url) {
    throw new Error("Sign-in service returned no login URL.");
  }
  return payload.url;
}

/**
 * Start OAuth login flow.
 *
 * On native platforms (iOS/Android), open the system browser directly so
 * the OAuth callback returns via deep link to the app.
 *
 * On web, this simply redirects to the login URL.
 *
 * @returns Always null, the callback is handled via deep link.
 */
export async function startOAuthLogin(): Promise<string | null> {
  const loginUrl = await getServerLoginUrl();

  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") window.location.href = loginUrl;
    return null;
  }

  try {
    const authSession = await WebBrowser.openAuthSessionAsync(loginUrl, getRedirectUri());
    if (authSession.type === "success" && authSession.url) {
      await Linking.openURL(authSession.url);
    }
    return authSession.type;
  } catch (sessionError) {
    console.warn("[OAuth] Auth session launch failed; falling back to system browser", sessionError);
    try {
      await Linking.openURL(loginUrl);
      return "opened";
    } catch (browserError) {
      console.error("[OAuth] System browser fallback failed", browserError);
      throw new Error("Could not open the secure sign-in flow. Check your internet connection and try again.");
    }
  }
}
