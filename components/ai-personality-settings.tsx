/**
 * AI Personality Settings Component
 * Allows users to customize AI tone, style, and add custom instructions
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { useAIPersonality } from "@/lib/ai-personality-context";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import * as Haptics from "expo-haptics";

export function AIPersonalitySettings() {
  const colors = useColors();
  const { personality, updatePersonality, resetToDefault } = useAIPersonality();
  const [customInstructions, setCustomInstructions] = useState(
    personality.customInstructions || ""
  );

  const handleToneChange = async (tone: "formal" | "sarcastic" | "mixed") => {
    await updatePersonality({ tone });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleStyleChange = async (
    style: "technical" | "beginner-friendly" | "humorous"
  ) => {
    await updatePersonality({ style });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCustomInstructionsChange = async (text: string) => {
    setCustomInstructions(text);
  };

  const handleSaveCustomInstructions = async () => {
    await updatePersonality({ customInstructions });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleReset = () => {
    Alert.alert("Reset to Default", "Are you sure? This will reset all AI settings.", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Reset",
        onPress: async () => {
          await resetToDefault();
          setCustomInstructions("");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        style: "destructive",
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, gap: 24 }}
    >
      {/* Tone Section */}
      <View className="gap-3">
        <Text className="text-lg font-semibold text-foreground">AI Tone</Text>
        <Text className="text-sm text-muted">
          How should the AI communicate with you?
        </Text>

        <View className="gap-2">
          {(["formal", "sarcastic", "mixed"] as const).map((tone) => (
            <Pressable
              key={tone}
              onPress={() => handleToneChange(tone)}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor:
                    personality.tone === tone ? colors.primary : colors.surface,
                  borderColor: personality.tone === tone ? colors.primary : colors.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                },
              ]}
            >
              <Text
                className={cn(
                  "font-medium",
                  personality.tone === tone ? "text-background" : "text-foreground"
                )}
              >
                {tone === "formal" && "Formal & Professional"}
                {tone === "sarcastic" && "Witty & Sarcastic"}
                {tone === "mixed" && "Mixed (Default)"}
              </Text>
              <Text
                className={cn(
                  "text-xs mt-1",
                  personality.tone === tone ? "text-background opacity-80" : "text-muted"
                )}
              >
                {tone === "formal" &&
                  "Clear, professional, and precise responses"}
                {tone === "sarcastic" &&
                  "Witty, brutally honest, dark humor"}
                {tone === "mixed" &&
                  "Professional with a touch of personality"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Style Section */}
      <View className="gap-3">
        <Text className="text-lg font-semibold text-foreground">AI Style</Text>
        <Text className="text-sm text-muted">
          How detailed should explanations be?
        </Text>

        <View className="gap-2">
          {(["technical", "beginner-friendly", "humorous"] as const).map((style) => (
            <Pressable
              key={style}
              onPress={() => handleStyleChange(style)}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor:
                    personality.style === style ? colors.primary : colors.surface,
                  borderColor: personality.style === style ? colors.primary : colors.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                },
              ]}
            >
              <Text
                className={cn(
                  "font-medium",
                  personality.style === style ? "text-background" : "text-foreground"
                )}
              >
                {style === "technical" && "Technical"}
                {style === "beginner-friendly" && "Beginner-Friendly"}
                {style === "humorous" && "Humorous"}
              </Text>
              <Text
                className={cn(
                  "text-xs mt-1",
                  personality.style === style ? "text-background opacity-80" : "text-muted"
                )}
              >
                {style === "technical" &&
                  "Assume coding experience, focus on efficiency"}
                {style === "beginner-friendly" &&
                  "Explain in simple terms, avoid jargon"}
                {style === "humorous" &&
                  "Make it entertaining with relatable examples"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Custom Instructions Section */}
      <View className="gap-3">
        <Text className="text-lg font-semibold text-foreground">
          Custom Instructions (Optional)
        </Text>
        <Text className="text-sm text-muted">
          Add any special instructions for the AI (e.g., "Always include error handling")
        </Text>

        <TextInput
          value={customInstructions}
          onChangeText={handleCustomInstructionsChange}
          placeholder="Enter custom instructions..."
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={4}
          className="bg-surface border border-border rounded-lg p-3 text-foreground"
          style={{
            textAlignVertical: "top",
            color: colors.foreground,
          }}
        />

        <Pressable
          onPress={handleSaveCustomInstructions}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.8 : 1,
              backgroundColor: colors.primary,
              borderRadius: 8,
              padding: 12,
              alignItems: "center",
            },
          ]}
        >
          <Text className="font-semibold text-background">Save Instructions</Text>
        </Pressable>
      </View>

      {/* Reset Button */}
      <Pressable
        onPress={handleReset}
        style={({ pressed }) => [
          {
            opacity: pressed ? 0.8 : 1,
            backgroundColor: colors.error,
            borderRadius: 8,
            padding: 12,
            alignItems: "center",
          },
        ]}
      >
        <Text className="font-semibold text-background">Reset to Default</Text>
      </Pressable>

      {/* Info Section */}
      <View className="bg-surface border border-border rounded-lg p-3">
        <Text className="text-xs text-muted leading-relaxed">
          These settings apply to all AI features: snippet generation, explanations, language
          conversion, and related suggestions. You can change them anytime.
        </Text>
      </View>
    </ScrollView>
  );
}
