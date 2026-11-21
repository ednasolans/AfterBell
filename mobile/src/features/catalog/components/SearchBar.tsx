import { Ionicons } from "@expo/vector-icons";
import { type Ref } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputInstance,
  View,
} from "react-native";

import { colors } from "@/theme/colors";

import { SEARCH_MAX_LENGTH } from "../api/searchActivities";

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  // The keyboard's search key: search at once, without waiting for the pause
  onSubmit: () => void;
  onClear: () => void;
  // To focus the input from outside (e.g. "Search activities")
  ref?: Ref<TextInputInstance>;
};

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onClear,
  ref,
}: Readonly<SearchBarProps>) {
  return (
    <View style={styles.bar}>
      <Ionicons name="search" size={20} color={colors.primaryDark} />
      <TextInput
        ref={ref}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder="Search activities, tutors or providers"
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        autoCorrect={false}
        // One more than the limit, so the "too long" message can be seen
        maxLength={SEARCH_MAX_LENGTH + 1}
        accessibilityLabel="Search activities"
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={onClear}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginTop: 12,
    // Outside the list, so the cards never touch the bar when scrolling
    marginBottom: 8,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.text },
});
