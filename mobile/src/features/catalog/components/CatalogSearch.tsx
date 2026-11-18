import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { NO_SEARCH_FILTERS, type SearchFilters } from "@/lib/searchFilters";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { colors } from "@/theme/colors";

import { trimSearchQuery, validateSearchQuery } from "../api/searchActivities";
import { activeFilterChips } from "../filterChips";
import { CatalogList } from "./CatalogList";
import { FilterBar } from "./FilterBar";
import { FilterPanel } from "./FilterPanel";
import { SearchBar } from "./SearchBar";
import { SearchResults } from "./SearchResults";

// Pause after the last key before searching
export const SEARCH_DEBOUNCE_MS = 300;

type CatalogSearchProps = {
  onOpen: (id: string) => void;
};

// The search bar and the filters above the activities: the full list without
// a text or filters, the results of the search otherwise. The text and the
// filters live here, so they are kept while an activity is open (the screen
// stays mounted under it).
export function CatalogSearch({ onOpen }: Readonly<CatalogSearchProps>) {
  const [text, setText] = useState("");
  // The text sent with the keyboard's search key, searched without the pause
  const [submitted, setSubmitted] = useState<string | null>(null);
  const debounced = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);
  const [filters, setFilters] = useState<SearchFilters>(NO_SEARCH_FILTERS);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // The text that is searched: the typed one after a pause, or at once when
  // it was submitted. An empty box shows the full list at once.
  const query =
    trimSearchQuery(text) === "" || text === submitted
      ? trimSearchQuery(text)
      : trimSearchQuery(debounced);
  const invalid = validateSearchQuery(query);
  // An invalid text is not searched, but the filters still are
  const searched = invalid ? "" : query;
  const hasFilters = activeFilterChips(filters).length > 0;

  return (
    <View style={styles.container}>
      <SearchBar
        value={text}
        onChangeText={setText}
        onSubmit={() => setSubmitted(text)}
        onClear={() => setText("")}
      />
      {invalid ? <Text style={styles.invalid}>{invalid}</Text> : null}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onOpenPanel={() => setIsPanelOpen(true)}
      />
      {searched === "" && !hasFilters ? (
        <CatalogList onOpen={onOpen} />
      ) : (
        <SearchResults query={searched} filters={filters} onOpen={onOpen} />
      )}
      {/* Mounted only while open, so it starts from the applied filters */}
      {isPanelOpen ? (
        <FilterPanel
          filters={filters}
          onApply={(applied) => {
            setFilters(applied);
            setIsPanelOpen(false);
          }}
          onClose={() => setIsPanelOpen(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  invalid: {
    color: colors.danger,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
  },
});
