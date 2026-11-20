import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { NO_SEARCH_FILTERS, type SearchFilters } from "@/lib/searchFilters";
import { colors } from "@/theme/colors";

import { activeFilterChips } from "../filterChips";

type FilterBarProps = {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onOpenPanel: () => void;
};

// Under the search bar: the button that opens the filter panel and the active
// filters as chips, each one removable, with a button to clear them all
export function FilterBar({
  filters,
  onChange,
  onOpenPanel,
}: Readonly<FilterBarProps>) {
  const chips = activeFilterChips(filters);

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          chips.length > 0 ? `Filters, ${chips.length} active` : "Filters"
        }
        onPress={onOpenPanel}
        style={styles.filtersButton}
      >
        <Ionicons name="options-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.filtersText}>Filters</Text>
        {chips.length > 0 ? (
          <Text style={styles.badge}>{chips.length}</Text>
        ) : null}
      </Pressable>

      {chips.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {chips.map((chip) => (
            <Pressable
              key={chip.key}
              accessibilityRole="button"
              accessibilityLabel={`Remove filter ${chip.label}`}
              onPress={() => onChange(chip.remove(filters))}
              style={styles.chip}
              hitSlop={4}
            >
              <Text style={styles.chipText}>{chip.label}</Text>
              <Ionicons name="close" size={14} color={colors.primaryDark} />
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => onChange(NO_SEARCH_FILTERS)}
            style={styles.clearAll}
            hitSlop={4}
          >
            <Text style={styles.clearAllText}>Clear all</Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 16,
    marginBottom: 8,
  },
  filtersButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filtersText: { color: colors.primaryDark, fontWeight: "700" },
  badge: {
    minWidth: 20,
    textAlign: "center",
    color: colors.white,
    backgroundColor: colors.primary,
    borderRadius: 10,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 5,
  },
  chips: { alignItems: "center", gap: 8, paddingRight: 16 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { color: colors.primaryDark, fontWeight: "600" },
  clearAll: { paddingHorizontal: 6, paddingVertical: 6 },
  clearAllText: { color: colors.danger, fontWeight: "700" },
});
