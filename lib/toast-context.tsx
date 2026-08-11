import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/use-colors";

type ToastTone = "success" | "error" | "info";

type ToastInput = {
  title: string;
  message?: string;
  tone?: ToastTone;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const colors = useColors();
  const [toast, setToast] = useState<Required<ToastInput> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -12, duration: 160, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    ({ title, message = "", tone = "success" }: ToastInput) => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      opacity.setValue(0);
      translateY.setValue(-12);
      setToast({ title, message, tone });
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start();
      });
      dismissTimer.current = setTimeout(dismiss, 2600);
    },
    [dismiss, opacity, translateY],
  );

  useEffect(
    () => () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    },
    [],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);
  const accent = toast?.tone === "error" ? colors.error : toast?.tone === "info" ? colors.primary : colors.success;

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {toast && (
          <Animated.View
            pointerEvents="none"
            accessibilityLiveRegion="polite"
            style={[
              styles.toast,
              {
                backgroundColor: colors.surface,
                borderColor: accent,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={[styles.indicator, { backgroundColor: accent }]} />
            <View style={styles.copy}>
              <Text style={[styles.title, { color: colors.foreground }]}>{toast.title}</Text>
              {toast.message ? <Text style={[styles.message, { color: colors.muted }]}>{toast.message}</Text> : null}
            </View>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toast: {
    position: "absolute",
    top: 54,
    left: 16,
    right: 16,
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingRight: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  indicator: { width: 4, borderRadius: 2, marginRight: 12, marginLeft: 12 },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: "700" },
  message: { fontSize: 12, lineHeight: 17 },
});
