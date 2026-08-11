/**
 * Collection Manager Component
 * Displays and manages snippet collections
 */

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Modal, TouchableOpacity } from "react-native";
import { useCategoryCollection } from "@/lib/category-collection-context";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import type { Collection } from "@/lib/types";
import * as Haptics from "expo-haptics";

interface CollectionManagerProps {
  onSelectCollection?: (collection: Collection) => void;
  selectedCollectionId?: string;
}

export function CollectionManager({ onSelectCollection, selectedCollectionId }: CollectionManagerProps) {
  const { state, addCollection, deleteCollection } = useCategoryCollection();
  const colors = useColors();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionColor, setNewCollectionColor] = useState("#3B82F6");

  const handleAddCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      await addCollection({
        name: newCollectionName,
        color: newCollectionColor,
        snippetIds: [],
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewCollectionName("");
      setShowAddModal(false);
    } catch (error) {
      console.error("Failed to add collection:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    try {
      await deleteCollection(collectionId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to delete collection:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const colors_palette = [
    "#3B82F6", // Blue
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#F59E0B", // Amber
    "#10B981", // Green
    "#06B6D4", // Cyan
    "#EF4444", // Red
    "#6366F1", // Indigo
  ];

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Text className="text-lg font-bold text-foreground">Collections</Text>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          className="bg-primary px-3 py-2 rounded-lg"
        >
          <Text className="text-background font-semibold text-sm">+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {state.collections.length === 0 ? (
          <View className="items-center justify-center py-8">
            <Text className="text-muted text-center">No collections yet</Text>
          </View>
        ) : (
          state.collections.map((collection) => {
            const isSelected = collection.id === selectedCollectionId;
            return (
              <Pressable
                key={collection.id}
                onPress={() => onSelectCollection?.(collection)}
                style={({ pressed }) => [
                  {
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    marginHorizontal: 8,
                    marginVertical: 4,
                    backgroundColor: isSelected ? colors.primary : pressed ? colors.surface : "transparent",
                    borderRadius: 8,
                    borderLeftWidth: 4,
                    borderLeftColor: collection.color || colors.primary,
                  },
                ]}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text
                      className={cn(
                        "font-semibold",
                        isSelected ? "text-background" : "text-foreground"
                      )}
                    >
                      {collection.name}
                    </Text>
                    <Text
                      className={cn(
                        "text-xs mt-1",
                        isSelected ? "text-background opacity-75" : "text-muted"
                      )}
                    >
                      {collection.snippetIds.length} snippet{collection.snippetIds.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteCollection(collection.id)}
                    className="ml-2 p-2"
                  >
                    <Text className={isSelected ? "text-background" : "text-muted"}>✕</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className="bg-background rounded-t-2xl p-6 gap-4"
            style={{ paddingBottom: 32 }}
          >
            <Text className="text-xl font-bold text-foreground">New Collection</Text>

            <View>
              <Text className="text-sm font-semibold text-foreground mb-2">Name</Text>
              <TextInput
                placeholder="Collection name..."
                placeholderTextColor={colors.muted}
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              />
            </View>

            <View>
              <Text className="text-sm font-semibold text-foreground mb-2">Color</Text>
              <View className="flex-row gap-2 flex-wrap">
                {colors_palette.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setNewCollectionColor(color)}
                    className="w-12 h-12 rounded-lg border-2"
                    style={{
                      backgroundColor: color,
                      borderColor: newCollectionColor === color ? colors.foreground : "transparent",
                    }}
                  />
                ))}
              </View>
            </View>

            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                className="flex-1 bg-surface border border-border rounded-lg py-3"
              >
                <Text className="text-center font-semibold text-foreground">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddCollection}
                className="flex-1 bg-primary rounded-lg py-3"
              >
                <Text className="text-center font-semibold text-background">Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
