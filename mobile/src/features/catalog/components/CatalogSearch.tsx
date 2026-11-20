import { type ReactElement, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { type AgeBounds } from "@/lib/ages";
import { toggleItemInArray } from "@/lib/arrays";
import { NO_SEARCH_FILTERS, type SearchFilters } from "@/lib/searchFilters";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { colors } from "@/theme/colors";

import { trimSearchQuery, validateSearchQuery } from "../api/searchActivities";
import { activeFilterChips } from "../filterChips";
import { CatalogList } from "./CatalogList";
import { CategoryShortcuts } from "./CategoryShortcuts";
import { FilterBar } from "./FilterBar";
import { FilterPanel } from "./FilterPanel";
import { SearchBar } from "./SearchBar";
import { SearchResults } from "./SearchResults";

// Pause after the last key before searching
export const SEARCH_DEBOUNCE_MS = 300;

type CatalogSearchProps = {
  onOpen: (id: string) => void;
  // Ages of the profile the customer is exploring for: they become the age
  // filter each time they change, and the customer can still remove it
  profileAges?: AgeBounds | null;
  // Shown at the top of the list while no text is searched (e.g. the
  // recommendations, which belong to another feature)
  listHeader?: ReactElement;
};

// The search bar and the filters above the activities: the full list without
// a text or filters, the results of the search otherwise. The text and the
// filters live here, so they are kept while an activity is open (the screen
// stays mounted under it).
export function CatalogSearch({
  onOpen,
  profileAges = null,
  listHeader,
}: Readonly<CatalogSearchProps>) {
  const [text, setText] = useState("");
  // The text sent with the keyboard's search key, searched without the pause
  const [submitted, setSubmitted] = useState<string | null>(null);
  const debounced = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);
  const [filters, setFilters] = useState<SearchFilters>(NO_SEARCH_FILTERS);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Applies the ages of a new profile during the render (no effect needed):
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const ageKey = profileAges
    ? `${profileAges.ageMin}-${profileAges.ageMax}`
    : null;
  const [appliedAgeKey, setAppliedAgeKey] = useState<string | null>(null);
  if (ageKey !== appliedAgeKey) {
    setAppliedAgeKey(ageKey);
    if (profileAges) {
      setFilters((current) => ({
        ...current,
        ageMin: profileAges.ageMin,
        ageMax: profileAges.ageMax,
      }));
    }
  }

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
  // Scrolled with the activities, so the header does not take their space
  const header = (
    <View>
      {searched === "" ? listHeader : null}
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Discover activities
      </Text>
    </View>
  );

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
      <CategoryShortcuts
        selected={filters.categories}
        onToggle={(category) =>
          setFilters((current) => ({
            ...current,
            categories: toggleItemInArray(current.categories, category),
          }))
        }
      />
      {searched === "" && !hasFilters ? (
        <CatalogList onOpen={onOpen} header={header} />
      ) : (
        <SearchResults
          query={searched}
          filters={filters}
          onOpen={onOpen}
          header={header}
        />
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
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 10,
  },
  invalid: {
    color: colors.danger,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
  },
});
