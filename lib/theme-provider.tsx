import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SchemeColors, type ColorScheme } from "@/constants/theme";

type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_MODE_KEY = "@snippet-bubbles/theme-mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [isLoaded, setIsLoaded] = useState(false);

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
      Object.entries(palette).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, []);

  const resolveColorScheme = useCallback((mode: ThemeMode, system: ColorScheme): ColorScheme => {
    if (mode === "system") return system;
    return mode;
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    const scheme = resolveColorScheme(mode, systemScheme);
    setColorSchemeState(scheme);
    applyScheme(scheme);
  }, [systemScheme, resolveColorScheme, applyScheme]);

  // Load theme mode on mount
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_MODE_KEY);
        const mode = (saved as ThemeMode) || "system";
        setThemeModeState(mode);
        const scheme = resolveColorScheme(mode, systemScheme);
        setColorSchemeState(scheme);
        applyScheme(scheme);
      } catch (error) {
        console.error("Failed to load theme mode", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadThemeMode();
  }, [systemScheme, resolveColorScheme, applyScheme]);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    applyScheme(scheme);
  }, [applyScheme]);

  // Update scheme when system scheme changes (only if in system mode)
  useEffect(() => {
    if (themeMode === "system") {
      setColorSchemeState(systemScheme);
      applyScheme(systemScheme);
    }
  }, [systemScheme, themeMode, applyScheme]);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": SchemeColors[colorScheme].primary,
        "color-background": SchemeColors[colorScheme].background,
        "color-surface": SchemeColors[colorScheme].surface,
        "color-foreground": SchemeColors[colorScheme].foreground,
        "color-muted": SchemeColors[colorScheme].muted,
        "color-border": SchemeColors[colorScheme].border,
        "color-success": SchemeColors[colorScheme].success,
        "color-warning": SchemeColors[colorScheme].warning,
        "color-error": SchemeColors[colorScheme].error,
      }),
    [colorScheme],
  );

  const value = useMemo(
    () => ({
      colorScheme,
      themeMode,
      setThemeMode,
      setColorScheme,
    }),
    [colorScheme, themeMode, setThemeMode, setColorScheme],
  );

  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: SchemeColors[colorScheme].background }} />;
  }
  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
