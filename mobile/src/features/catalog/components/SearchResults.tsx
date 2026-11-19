import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { LoadingView } from "@/components/LoadingView";
import { colors } from "@/theme/colors";
import { SearchSummary } from "@/features/search-summary/components/SearchSummary";
import { NO_SEARCH_FILTERS } from "@/lib/searchFilters";

import { useSearchActivities } from "../hooks/useSearchActivities";
import { useSearchCount } from "../hooks/useSearchCount";
import { CatalogActivityCard } from "./CatalogActivityCard";

type SearchResultsProps = {
  // Trimmed and valid
  query: string;
  onOpen: (id: string) => void;
};

function countLabel(total: number): string {
  return total === 1 ? "1 activity found" : `${total} activities found`;
}

// The activities that match a search, with how many there are. More pages are
// loaded when the end of the list is reached.
export function SearchResults({ query, onOpen }: Readonly<SearchResultsProps>) {
  const results = useSearchActivities(query);
  const count = useSearchCount(query);

  if (results.isPending) {
    return <LoadingView />;
  }

  if (results.isError) {
    console.error("Search error:", results.error);
    return (
      <ErrorView
        message="The search could not be completed."
        onRetry={() => {
          void results.refetch();
          void count.refetch();
        }}
      />
    );
  }

  const activities = results.data.pages.flat();

  return (
    <FlatList
      testID="search-results"
      style={styles.list}
      contentContainerStyle={styles.container}
      data={activities}
      keyExtractor={(item) => item.activity.id}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (
          results.hasNextPage &&
          !results.isFetchingNextPage &&
          !results.isFetchNextPageError
        ) {
          void results.fetchNextPage();
        }
      }}
      ListHeaderComponent={
        activities.length > 0 ? (
          <>
            {/* The AI summary only starts once there are results to summarize */}
            <SearchSummary filters={{ ...NO_SEARCH_FILTERS, query }} enabled />
            {count.data === undefined ? null : (
              <Text style={styles.count} accessibilityLiveRegion="polite">
                {countLabel(count.data)}
              </Text>
            )}
          </>
        ) : undefined
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {`No activities match "${query}".`}
          </Text>
          <Text style={styles.emptyHint}>
            Try other words, check the spelling or clear the search to see every
            activity.
          </Text>
        </View>
      }
      ListFooterComponent={
        <SearchFooter
          loading={results.isFetchingNextPage}
          failed={results.isFetchNextPageError}
          onRetry={() => void results.fetchNextPage()}
        />
      }
      renderItem={({ item }) => (
        <CatalogActivityCard
          activity={item.activity}
          providerName={item.provider.contact?.name ?? null}
          isFavourite={item.isFavourite}
          onPress={() => onOpen(item.activity.id)}
        />
      )}
    />
  );
}

type SearchFooterProps = {
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
};

// Below the results: a spinner while the next page loads, or a retry if it failed
function SearchFooter({ loading, failed, onRetry }: SearchFooterProps) {
  if (loading) {
    return (
      <ActivityIndicator
        style={styles.footer}
        accessibilityLabel="Loading more results"
      />
    );
  }
  if (failed) {
    return (
      <View style={styles.footer}>
        <Text style={styles.emptyHint}>More results could not be loaded.</Text>
        <Pressable accessibilityRole="button" onPress={onRetry}>
          <Text style={styles.retry}>Try again</Text>
        </Pressable>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.background },
  container: { padding: 16, paddingTop: 0 },
  count: {
    color: colors.textMuted,
    fontWeight: "700",
    marginBottom: 8,
  },
  empty: { alignItems: "center", marginTop: 24, gap: 6 },
  emptyTitle: { color: colors.text, fontWeight: "700", textAlign: "center" },
  emptyHint: { color: colors.textMuted, textAlign: "center" },
  footer: { alignItems: "center", paddingVertical: 16, gap: 6 },
  retry: { color: colors.primaryDark, fontWeight: "700" },
});
