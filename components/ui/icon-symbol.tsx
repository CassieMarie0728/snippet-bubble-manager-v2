// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings.
 */
const MAPPING = {
  // Tab bar icons
  "house.fill": "home",
  "heart.fill": "favorite",
  "gearshape.fill": "settings",
  // Action icons
  "doc.on.doc.fill": "content-copy",
  "plus": "add",
  "pencil": "edit",
  "trash.fill": "delete",
  "pin.fill": "push-pin",
  "magnifyingglass": "search",
  "xmark": "close",
  "chevron.left": "chevron-left",
  "chevron.right": "chevron-right",
  "checkmark": "check",
  "arrow.left": "arrow-back",
  "square.and.arrow.up": "file-upload",
  "square.and.arrow.down": "file-download",
  "info.circle": "info",
  "tag.fill": "label",
  "chevron.left.forwardslash.chevron.right": "code",
  "paperplane.fill": "send",
  "sparkles": "auto-awesome",
  "hand.raised.fill": "privacy-tip",
  "arrow.triangle.2.circlepath": "sync",
  "person.crop.circle.badge.plus": "person-add",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
