/**
 * AI Personality Context
 * Manages user's AI personality preferences (tone, style, custom instructions)
 * Persists to AsyncStorage
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AIPersonality } from "./ai-service";

const AI_PERSONALITY_KEY = "ai_personality_settings";

interface AIPersonalityContextType {
  personality: AIPersonality;
  updatePersonality: (personality: Partial<AIPersonality>) => Promise<void>;
  resetToDefault: () => Promise<void>;
  isLoading: boolean;
}

const AIPersonalityContext = createContext<AIPersonalityContextType | undefined>(
  undefined
);

const DEFAULT_PERSONALITY: AIPersonality = {
  tone: "mixed",
  style: "technical",
  customInstructions: "",
};

export function AIPersonalityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [personality, setPersonality] = useState<AIPersonality>(DEFAULT_PERSONALITY);
  const [isLoading, setIsLoading] = useState(true);

  // Load personality settings on mount
  useEffect(() => {
    loadPersonality();
  }, []);

  const loadPersonality = async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(AI_PERSONALITY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPersonality(parsed);
      }
    } catch (error) {
      console.error("Error loading AI personality settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePersonality = async (updates: Partial<AIPersonality>) => {
    try {
      const updated = { ...personality, ...updates };
      setPersonality(updated);
      await AsyncStorage.setItem(AI_PERSONALITY_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving AI personality settings:", error);
      throw error;
    }
  };

  const resetToDefault = async () => {
    try {
      setPersonality(DEFAULT_PERSONALITY);
      await AsyncStorage.removeItem(AI_PERSONALITY_KEY);
    } catch (error) {
      console.error("Error resetting AI personality settings:", error);
      throw error;
    }
  };

  return (
    <AIPersonalityContext.Provider
      value={{
        personality,
        updatePersonality,
        resetToDefault,
        isLoading,
      }}
    >
      {children}
    </AIPersonalityContext.Provider>
  );
}

export function useAIPersonality() {
  const context = useContext(AIPersonalityContext);
  if (!context) {
    throw new Error("useAIPersonality must be used within AIPersonalityProvider");
  }
  return context;
}
