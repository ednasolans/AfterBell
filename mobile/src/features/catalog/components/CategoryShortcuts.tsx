import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { categoryOptions } from "@/lib/activityCategories";
import { colors } from "@/theme/colors";

import { useAvailableFilters } from "../hooks/useAvailableFilters";
import { activityIcon, CATEGORY_TINTS } from "../visuals";

type CategoryShortcutsProps = {
  // Categories of the filters now
  selected: readonly string[];
  // Adds the category to the filters, or removes it if it was there
  onToggle: (category: string) => void;
};

// A row of categories under the search bar, a shortcut to the category filter
export function CategoryShortcuts({
  selected,
  onToggle,
}: Readonly<CategoryShortcutsProps>) {
  const available = useAvailableFilters();
  const options = categoryOptions(
    available.data?.categories.map((name) => ({ name })),
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {options.map((option, index) => {
        const isSelected = selected.includes(option.value);
        const tint = CATEGORY_TINTS[index % CATEGORY_TINTS.length];
        return (
          <Pressable
            key={option.value}
            accessibilityRole="checkbox"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: isSelected }}
            onPress={() => onToggle(option.value)}
            style={styles.item}
          >
            <View
              style={[
                styles.icon,
                { backgroundColor: tint.background },
                isSelected && styles.iconSelected,
              ]}
            >
              <Ionicons
                name={activityIcon(option.value)}
                size={24}
                color={tint.icon}
              />
            </View>
            <Text
              style={[styles.label, isSelected && styles.labelSelected]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // A horizontal ScrollView can shrink by default: on short screens the list
  // below would be drawn over the icons
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { gap: 14, paddingHorizontal: 16, paddingBottom: 8 },
  item: { alignItems: "center", gap: 6, width: 68 },
  icon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  iconSelected: { borderColor: colors.primary },
  label: { color: colors.text, fontSize: 12, fontWeight: "600" },
  labelSelected: { color: colors.primaryDark, fontWeight: "800" },
});
