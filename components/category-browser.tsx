/**
 * Category Browser Component
 * Displays hierarchical categories and allows navigation through them
 */

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, FlatList } from "react-native";
import { useCategoryCollection } from "@/lib/category-collection-context";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

interface CategoryBrowserProps {
  onSelectCategory?: (category: Category) => void;
  selectedCategoryId?: string;
}

export function CategoryBrowser({ onSelectCategory, selectedCategoryId }: CategoryBrowserProps) {
  const { state } = useCategoryCollection();
  const colors = useColors();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedIds(newExpanded);
  };

  const getChildCategories = (parentId?: string): Category[] => {
    return state.categories.filter((c) => c.parentId === parentId);
  };

  const renderCategoryItem = (category: Category, depth: number = 0) => {
    const children = getChildCategories(category.id);
    const isExpanded = expandedIds.has(category.id);
    const isSelected = category.id === selectedCategoryId;

    return (
      <View key={category.id}>
        <Pressable
          onPress={() => {
            onSelectCategory?.(category);
            if (children.length > 0) {
              toggleExpanded(category.id);
            }
          }}
          style={({ pressed }) => [
            {
              paddingLeft: depth * 16 + 12,
              paddingVertical: 10,
              paddingRight: 12,
              backgroundColor: isSelected ? colors.primary : pressed ? colors.surface : "transparent",
              borderRadius: 8,
              marginHorizontal: 8,
              marginVertical: 2,
            },
          ]}
        >
          <View className="flex-row items-center gap-2">
            {children.length > 0 && (
              <Text
                className={cn(
                  "text-lg font-semibold",
                  isExpanded ? "text-foreground" : "text-muted"
                )}
              >
                {isExpanded ? "▼" : "▶"}
              </Text>
            )}
            {children.length === 0 && <Text className="w-6" />}

            {category.icon && (
              <Text className="text-lg">{getIconEmoji(category.icon)}</Text>
            )}

            <View className="flex-1">
              <Text
                className={cn(
                  "font-semibold",
                  isSelected ? "text-background" : "text-foreground"
                )}
              >
                {category.name}
              </Text>
              {category.snippetCount !== undefined && category.snippetCount > 0 && (
                <Text
                  className={cn(
                    "text-xs",
                    isSelected ? "text-background opacity-75" : "text-muted"
                  )}
                >
                  {category.snippetCount} snippet{category.snippetCount !== 1 ? "s" : ""}
                </Text>
              )}
            </View>
          </View>
        </Pressable>

        {isExpanded &&
          children.map((child) => renderCategoryItem(child, depth + 1))}
      </View>
    );
  };

  const topLevelCategories = getChildCategories();

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingVertical: 8 }}
      showsVerticalScrollIndicator={false}
    >
      {topLevelCategories.length === 0 ? (
        <View className="items-center justify-center py-8">
          <Text className="text-muted text-center">No categories yet</Text>
        </View>
      ) : (
        topLevelCategories.map((category) => renderCategoryItem(category))
      )}
    </ScrollView>
  );
}

function getIconEmoji(icon: string): string {
  const iconMap: Record<string, string> = {
    server: "🖥️",
    code: "💻",
    database: "🗄️",
    settings: "⚙️",
    tools: "🔧",
    folder: "📁",
    star: "⭐",
    bookmark: "🔖",
    tag: "🏷️",
    default: "📝",
  };
  return iconMap[icon] || iconMap.default;
}
