/**
 * AI Tab Screen
 * Generate snippets from prompts, view generation history, quick AI actions
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAIPersonality } from "@/lib/ai-personality-context";
import { generateSnippet, type GenerateSnippetResponse } from "@/lib/ai-service";
import { useSnippets } from "@/lib/snippet-context";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GENERATION_HISTORY_KEY = "ai_generation_history";

interface GenerationHistoryItem extends GenerateSnippetResponse {
  id: string;
  prompt: string;
  generatedAt: number;
}

export default function AIScreen() {
  const colors = useColors();
  const { personality } = useAIPersonality();
  const { addSnippet } = useSnippets();

  const [prompt, setPrompt] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("JavaScript");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSnippet, setGeneratedSnippet] = useState<GenerateSnippetResponse | null>(null);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load generation history on mount
  React.useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(GENERATION_HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading generation history:", error);
    }
  };

  const saveToHistory = async (item: GenerationHistoryItem) => {
    try {
      const updated = [item, ...history].slice(0, 20); // Keep last 20
      setHistory(updated);
      await AsyncStorage.setItem(GENERATION_HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert("Empty Prompt", "Please describe what snippet you want to generate.");
      return;
    }

    try {
      setIsGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await generateSnippet({
        prompt: prompt.trim(),
        language: selectedLanguage,
        personality,
      });

      setGeneratedSnippet(result);

      // Save to history
      const historyItem: GenerationHistoryItem = {
        ...result,
        id: `gen_${Date.now()}`,
        prompt: prompt.trim(),
        generatedAt: Date.now(),
      };
      await saveToHistory(historyItem);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error generating snippet:", error);
      Alert.alert("Generation Failed", "Could not generate snippet. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSnippet = useCallback(async () => {
    if (!generatedSnippet) return;

    try {
      const newSnippet = {
        id: `snippet_${Date.now()}`,
        title: generatedSnippet.explanation.substring(0, 50) || "Generated Snippet",
        code: generatedSnippet.code,
        language: generatedSnippet.language,
        description: generatedSnippet.explanation,
        tags: generatedSnippet.tags,
        isFavorite: false,
        isPinned: false,
        lastCopiedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      addSnippet(newSnippet);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Snippet added to your library!");
      setGeneratedSnippet(null);
      setPrompt("");
    } catch (error) {
      console.error("Error saving snippet:", error);
      Alert.alert("Error", "Could not save snippet. Please try again.");
    }
  }, [generatedSnippet, addSnippet]);

  const handleClearHistory = () => {
    Alert.alert("Clear History", "Are you sure? This cannot be undone.", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Clear",
        onPress: async () => {
          setHistory([]);
          await AsyncStorage.removeItem(GENERATION_HISTORY_KEY);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        style: "destructive",
      },
    ]);
  };

  const languages = [
    "JavaScript",
    "TypeScript",
    "Python",
    "React",
    "Vue",
    "Rust",
    "Go",
    "Java",
    "C++",
    "SQL",
  ];

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mt-4 mb-6">
          <Text className="text-3xl font-bold text-foreground mb-1">AI Generator</Text>
          <Text className="text-sm text-muted">Create snippets from natural language</Text>
        </View>

        {/* Prompt Input */}
        <View className="gap-3 mb-4">
          <Text className="text-sm font-semibold text-foreground">What do you want to build?</Text>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="e.g., React hook for fetching data with error handling"
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            className="bg-surface border border-border rounded-lg p-3 text-foreground"
            style={{
              textAlignVertical: "top",
              color: colors.foreground,
            }}
            editable={!isGenerating}
          />
        </View>

        {/* Language Selector */}
        <View className="gap-3 mb-4">
          <Text className="text-sm font-semibold text-foreground">Language</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {languages.map((lang) => (
              <Pressable
                key={lang}
                onPress={() => {
                  setSelectedLanguage(lang);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.7 : 1,
                    backgroundColor:
                      selectedLanguage === lang ? colors.primary : colors.surface,
                    borderColor: selectedLanguage === lang ? colors.primary : colors.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  },
                ]}
              >
                <Text
                  className={`text-xs font-medium ${
                    selectedLanguage === lang ? "text-background" : "text-foreground"
                  }`}
                >
                  {lang}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Generate Button */}
        <Pressable
          onPress={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.8 : 1,
              backgroundColor: isGenerating || !prompt.trim() ? colors.muted : colors.primary,
              borderRadius: 8,
              paddingVertical: 14,
              alignItems: "center",
              marginBottom: 24,
            },
          ]}
        >
          {isGenerating ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="auto-awesome" size={18} color={colors.background} />
              <Text className="font-semibold text-background">Generate Snippet</Text>
            </View>
          )}
        </Pressable>

        {/* Generated Snippet Preview */}
        {generatedSnippet && (
          <View className="bg-surface border border-border rounded-lg p-4 gap-3 mb-6">
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-xs font-semibold text-muted uppercase mb-1">
                  Generated
                </Text>
                <Text className="text-sm font-mono text-foreground">
                  {generatedSnippet.language}
                </Text>
              </View>
              <View className="bg-primary px-2 py-1 rounded">
                <Text className="text-xs font-semibold text-background">
                  {generatedSnippet.tags.length} tags
                </Text>
              </View>
            </View>

            <View className="bg-background rounded p-3 max-h-40">
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="text-xs text-foreground font-mono leading-relaxed">
                  {generatedSnippet.code}
                </Text>
              </ScrollView>
            </View>

            <View className="gap-2">
              <Text className="text-xs text-muted">{generatedSnippet.explanation}</Text>
              {generatedSnippet.tags.length > 0 && (
                <View className="flex-row flex-wrap gap-1">
                  {generatedSnippet.tags.map((tag, i) => (
                    <View key={i} className="bg-primary bg-opacity-20 px-2 py-1 rounded">
                      <Text className="text-xs text-primary font-medium">{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <Pressable
              onPress={handleSaveSnippet}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  backgroundColor: colors.primary,
                  borderRadius: 8,
                  paddingVertical: 10,
                  alignItems: "center",
                },
              ]}
            >
              <Text className="font-semibold text-background">Save to Library</Text>
            </Pressable>
          </View>
        )}

        {/* Generation History */}
        <View className="gap-3">
          <View className="flex-row justify-between items-center">
            <Text className="text-lg font-semibold text-foreground">History</Text>
            {history.length > 0 && (
              <Pressable onPress={() => setShowHistory(!showHistory)}>
                <MaterialIcons
                  name={showHistory ? "expand-less" : "expand-more"}
                  size={24}
                  color={colors.primary}
                />
              </Pressable>
            )}
          </View>

          {history.length === 0 ? (
            <View className="bg-surface border border-border rounded-lg p-4 items-center">
              <MaterialIcons name="history" size={32} color={colors.muted} />
              <Text className="text-sm text-muted mt-2">No generation history yet</Text>
            </View>
          ) : showHistory ? (
            <>
              <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setPrompt(item.prompt);
                      setSelectedLanguage(item.language);
                      setGeneratedSnippet({
                        code: item.code,
                        language: item.language,
                        explanation: item.explanation,
                        tags: item.tags,
                      });
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={({ pressed }) => [
                      {
                        opacity: pressed ? 0.7 : 1,
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 8,
                      },
                    ]}
                  >
                    <Text className="text-sm font-medium text-foreground mb-1">
                      {item.prompt.substring(0, 60)}...
                    </Text>
                    <Text className="text-xs text-muted">
                      {item.language} •{" "}
                      {new Date(item.generatedAt).toLocaleDateString()}
                    </Text>
                  </Pressable>
                )}
              />
              {history.length > 0 && (
                <Pressable
                  onPress={handleClearHistory}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.8 : 1,
                      backgroundColor: colors.error,
                      borderRadius: 8,
                      paddingVertical: 10,
                      alignItems: "center",
                      marginTop: 8,
                    },
                  ]}
                >
                  <Text className="font-semibold text-background text-sm">
                    Clear History
                  </Text>
                </Pressable>
              )}
            </>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
