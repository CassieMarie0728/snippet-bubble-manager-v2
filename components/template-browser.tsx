import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  TextInput,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import { IconSymbol } from "./ui/icon-symbol";
import {
  getAllTemplates,
  getTemplatesByCategory,
  getTemplatesByDifficulty,
  searchTemplates,
  type SnippetTemplate,
} from "@/lib/snippet-templates";

interface TemplateBrowserProps {
  onSelectTemplate: (template: SnippetTemplate) => void;
  onClose: () => void;
}

type FilterCategory =
  | "all"
  | "web"
  | "backend"
  | "database"
  | "devops"
  | "utility"
  | "script";
type FilterDifficulty = "all" | "beginner" | "intermediate" | "advanced";

export function TemplateBrowser({
  onSelectTemplate,
  onClose,
}: TemplateBrowserProps) {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>(
    "all"
  );
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<FilterDifficulty>("all");

  // Get filtered templates
  let filteredTemplates = getAllTemplates();

  if (searchQuery.trim()) {
    filteredTemplates = searchTemplates(searchQuery);
  }

  if (selectedCategory !== "all") {
    filteredTemplates = filteredTemplates.filter(
      (t) => t.category === selectedCategory
    );
  }

  if (selectedDifficulty !== "all") {
    filteredTemplates = filteredTemplates.filter(
      (t) => t.difficulty === selectedDifficulty
    );
  }

  const categories: { label: string; value: FilterCategory }[] = [
    { label: "All", value: "all" },
    { label: "Web", value: "web" },
    { label: "Backend", value: "backend" },
    { label: "Database", value: "database" },
    { label: "DevOps", value: "devops" },
    { label: "Utility", value: "utility" },
    { label: "Script", value: "script" },
  ];

  const difficulties: { label: string; value: FilterDifficulty }[] = [
    { label: "All", value: "all" },
    { label: "Beginner", value: "beginner" },
    { label: "Intermediate", value: "intermediate" },
    { label: "Advanced", value: "advanced" },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "#10B981";
      case "intermediate":
        return "#F59E0B";
      case "advanced":
        return "#EF4444";
      default:
        return colors.muted;
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-border">
        <Text className="text-2xl font-bold text-foreground">Templates</Text>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <IconSymbol name="chevron.right" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search */}
        <View className="p-4">
          <View className="flex-row items-center bg-surface rounded-lg px-3 py-2 border border-border">
            <IconSymbol name="chevron.left.forwardslash.chevron.right" size={18} color={colors.muted} />
            <TextInput
              placeholder="Search templates..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2 text-foreground"
            />
          </View>
        </View>

        {/* Category Filter */}
        <View className="px-4 mb-4">
          <Text className="text-sm font-semibold text-muted mb-2">
            Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row gap-2"
          >
            {categories.map((cat) => (
              <Pressable
                key={cat.value}
                onPress={() => setSelectedCategory(cat.value)}
                style={({ pressed }) => [
                  pressed && { opacity: 0.7 },
                ]}
                className={cn(
                  "px-3 py-1 rounded-full",
                  selectedCategory === cat.value
                    ? "bg-primary"
                    : "bg-surface border border-border"
                )}
              >
                <Text
                  className={cn(
                    "text-sm font-medium",
                    selectedCategory === cat.value
                      ? "text-background"
                      : "text-foreground"
                  )}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Difficulty Filter */}
        <View className="px-4 mb-4">
          <Text className="text-sm font-semibold text-muted mb-2">
            Difficulty
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row gap-2"
          >
            {difficulties.map((diff) => (
              <Pressable
                key={diff.value}
                onPress={() => setSelectedDifficulty(diff.value)}
                style={({ pressed }) => [
                  pressed && { opacity: 0.7 },
                ]}
                className={cn(
                  "px-3 py-1 rounded-full",
                  selectedDifficulty === diff.value
                    ? "bg-primary"
                    : "bg-surface border border-border"
                )}
              >
                <Text
                  className={cn(
                    "text-sm font-medium",
                    selectedDifficulty === diff.value
                      ? "text-background"
                      : "text-foreground"
                  )}
                >
                  {diff.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Templates List */}
        <View className="px-4 pb-4">
          {filteredTemplates.length === 0 ? (
            <View className="items-center justify-center py-8">
              <Text className="text-muted text-center">
                No templates found
              </Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={filteredTemplates}
              keyExtractor={(item) => item.templateId}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelectTemplate(item);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    pressed && { opacity: 0.7 },
                  ]}
                  className="bg-surface rounded-lg p-4 mb-3 border border-border"
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground">
                        {item.title}
                      </Text>
                      <Text className="text-xs text-muted mt-1">
                        {item.language}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: getDifficultyColor(item.difficulty),
                      }}
                      className="px-2 py-1 rounded"
                    >
                      <Text className="text-xs font-medium text-white capitalize">
                        {item.difficulty}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-sm text-muted mb-2">
                    {item.description}
                  </Text>

                  <View className="flex-row flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag) => (
                      <View
                        key={tag}
                        className="bg-background rounded px-2 py-1"
                      >
                        <Text className="text-xs text-primary">{tag}</Text>
                      </View>
                    ))}
                    {item.tags.length > 3 && (
                      <View className="bg-background rounded px-2 py-1">
                        <Text className="text-xs text-muted">
                          +{item.tags.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
