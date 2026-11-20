import { FlatList, StyleSheet, Text } from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { LoadingView } from "@/components/LoadingView";
import { colors } from "@/theme/colors";

import { loadNextPage, useRecommendations } from "../hooks/useRecommendations";
import { NextPageFooter } from "./NextPageFooter";
import { RecommendationCard } from "./RecommendationCard";

type RecommendationsListProps = {
  onOpen: (id: string) => void;
};

// Every recommendation, one page after another ("See all")
export function RecommendationsList({
  onOpen,
}: Readonly<RecommendationsListProps>) {
  const recommendations = useRecommendations();

  if (recommendations.isPending) {
    return <LoadingView />;
  }

  // A later page that fails keeps the loaded ones: its footer offers a retry
  const pages = recommendations.data?.pages;
  if (!pages) {
    return (
      <ErrorView
        message="Your recommendations could not be loaded."
        onRetry={() => void recommendations.refetch()}
      />
    );
  }

  return (
    <FlatList
      testID="recommendations-list"
      style={styles.list}
      contentContainerStyle={styles.container}
      data={pages.flatMap((page) => page.recommendations)}
      keyExtractor={(item) => item.activity.id}
      refreshing={recommendations.isRefetching}
      onRefresh={() => void recommendations.refetch()}
      onEndReachedThreshold={0.5}
      onEndReached={() => loadNextPage(recommendations)}
      ListEmptyComponent={
        <Text style={styles.empty}>There are no recommendations yet.</Text>
      }
      ListFooterComponent={
        <NextPageFooter
          loading={recommendations.isFetchingNextPage}
          failed={recommendations.isFetchNextPageError}
          onRetry={() => void recommendations.fetchNextPage()}
        />
      }
      renderItem={({ item }) => (
        <RecommendationCard recommendation={item} onOpen={onOpen} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.background },
  container: { padding: 16 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 24 },
});
