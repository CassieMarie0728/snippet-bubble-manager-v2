/**
 * AI Snippet Expansion Component
 * Inline expansion on snippet cards with Explain, Convert, Generate Related buttons
 * Can expand to full chat modal
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useAIPersonality } from "@/lib/ai-personality-context";
import {
  explainSnippet,
  convertSnippet,
  generateRelatedSnippets,
} from "@/lib/ai-service";
import type { Snippet } from "@/lib/types";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type AIAction = "explain" | "convert" | "related" | null;

interface AISnippetExpansionProps {
  snippet: Snippet;
  onAddSnippet?: (snippet: Snippet) => void;
}

export function AISnippetExpansion({
  snippet,
  onAddSnippet,
}: AISnippetExpansionProps) {
  const colors = useColors();
  const { personality } = useAIPersonality();
  const [activeAction, setActiveAction] = useState<AIAction>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [showFullChat, setShowFullChat] = useState(false);
  const [targetLanguage] = useState("JavaScript");

  const handleExplain = async () => {
    try {
      setActiveAction("explain");
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const response = await explainSnippet({
        code: snippet.code,
        language: snippet.language,
        personality,
      });

      setResult(response.explanation);
    } catch (error) {
      setResult("Error explaining snippet. Please try again.");
      console.error("Error explaining snippet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvert = async () => {
    try {
      setActiveAction("convert");
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const response = await convertSnippet({
        code: snippet.code,
        fromLanguage: snippet.language,
        toLanguage: targetLanguage,
        personality,
      });

      setResult(response.code);
    } catch (error) {
      setResult("Error converting snippet. Please try again.");
      console.error("Error converting snippet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRelated = async () => {
    try {
      setActiveAction("related");
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const responses = await generateRelatedSnippets(snippet, personality);
      setResult(
        responses
          .map(
            (r, i) =>
              `Variation ${i + 1}:\n${r.code}\n\nExplanation: ${r.explanation}\n`
          )
          .join("\n---\n\n")
      );
    } catch (error) {
      setResult("Error generating related snippets. Please try again.");
      console.error("Error generating related snippets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFullChat = () => {
    setShowFullChat(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleClose = () => {
    setActiveAction(null);
    setResult("");
    setShowFullChat(false);
  };

  return (
    <>
      {/* Inline Buttons */}
      <View className="flex-row gap-2 mt-3 flex-wrap">
        <Pressable
          onPress={handleExplain}
          disabled={isLoading && activeAction === "explain"}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.7 : 1,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            },
          ]}
        >
          {isLoading && activeAction === "explain" ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcons name="lightbulb" size={14} color={colors.primary} />
          )}
          <Text className="text-xs font-medium text-foreground">Explain</Text>
        </Pressable>

        <Pressable
          onPress={handleConvert}
          disabled={isLoading && activeAction === "convert"}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.7 : 1,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            },
          ]}
        >
          {isLoading && activeAction === "convert" ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcons name="translate" size={14} color={colors.primary} />
          )}
          <Text className="text-xs font-medium text-foreground">Convert</Text>
        </Pressable>

        <Pressable
          onPress={handleGenerateRelated}
          disabled={isLoading && activeAction === "related"}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.7 : 1,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            },
          ]}
        >
          {isLoading && activeAction === "related" ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcons name="auto-awesome" size={14} color={colors.primary} />
          )}
          <Text className="text-xs font-medium text-foreground">Related</Text>
        </Pressable>
      </View>

      {/* Inline Result */}
      {activeAction && result && (
        <View className="mt-3 bg-surface border border-border rounded-lg p-3 gap-2">
          <Text className="text-xs font-semibold text-foreground uppercase opacity-70">
            {activeAction === "explain" && "Explanation"}
            {activeAction === "convert" && "Converted Code"}
            {activeAction === "related" && "Related Variations"}
          </Text>
          <ScrollView className="max-h-40 bg-background rounded p-2">
            <Text className="text-xs text-foreground font-mono leading-relaxed">
              {result}
            </Text>
          </ScrollView>
          <Pressable
            onPress={handleOpenFullChat}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.8 : 1,
                backgroundColor: colors.primary,
                borderRadius: 6,
                paddingVertical: 8,
                alignItems: "center",
              },
            ]}
          >
            <Text className="text-xs font-semibold text-background">
              Open Full Chat
            </Text>
          </Pressable>
        </View>
      )}

      {/* Full Chat Modal */}
      <Modal
        visible={showFullChat}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View className="flex-1 bg-background">
          {/* Header */}
          <View className="bg-surface border-b border-border p-4 flex-row justify-between items-center">
            <Text className="text-lg font-semibold text-foreground">
              AI Chat
            </Text>
            <Pressable onPress={handleClose}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Chat Content */}
          <ScrollView className="flex-1 p-4 gap-4">
            {/* Initial snippet context */}
            <View className="bg-surface border border-border rounded-lg p-3">
              <Text className="text-xs font-semibold text-muted mb-2">
                SNIPPET: {snippet.title}
              </Text>
              <Text className="text-xs text-foreground font-mono">
                {snippet.code}
              </Text>
            </View>

            {/* AI Response */}
            {result && (
              <View className="bg-primary bg-opacity-10 border border-primary rounded-lg p-3">
                <Text className="text-sm text-foreground leading-relaxed">
                  {result}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View className="border-t border-border p-4 gap-2">
            <Pressable
              onPress={handleExplain}
              disabled={isLoading}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  backgroundColor: colors.primary,
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: "center",
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text className="font-semibold text-background">
                  Explain This Code
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
