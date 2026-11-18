import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { colors } from "@/theme/colors";

import { trimSearchQuery, validateSearchQuery } from "../api/searchActivities";
import { CatalogList } from "./CatalogList";
import { SearchBar } from "./SearchBar";
import { SearchResults } from "./SearchResults";

// Pause after the last key before searching
export const SEARCH_DEBOUNCE_MS = 300;

type CatalogSearchProps = {
  onOpen: (id: string) => void;
};

// The search bar above the activities: the full list without a text, the
// results of the search with one. The text lives here, so it is kept while an
// activity is open (the screen stays mounted under it).
export function CatalogSearch({ onOpen }: Readonly<CatalogSearchProps>) {
  const [text, setText] = useState("");
  // The text sent with the keyboard's search key, searched without the pause
  const [submitted, setSubmitted] = useState<string | null>(null);
  const debounced = useDebouncedValue(text, SEARCH_DEBOUNCE_MS);

  // The text that is searched: the typed one after a pause, or at once when
  // it was submitted. An empty box shows the full list at once.
  const query =
    trimSearchQuery(text) === "" || text === submitted
      ? trimSearchQuery(text)
      : trimSearchQuery(debounced);
  const invalid = validateSearchQuery(query);

  return (
    <View style={styles.container}>
      <SearchBar
        value={text}
        onChangeText={setText}
        onSubmit={() => setSubmitted(text)}
        onClear={() => setText("")}
      />
      {invalid ? <Text style={styles.invalid}>{invalid}</Text> : null}
      {query === "" || invalid ? (
        <CatalogList onOpen={onOpen} />
      ) : (
        <SearchResults query={query} onOpen={onOpen} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  invalid: {
    color: colors.danger,
    marginHorizontal: 16,
    marginTop: 6,
  },
});
