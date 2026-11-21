import { FlatList, StyleSheet, Text, View } from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { LoadingView } from "@/components/LoadingView";
import { colors } from "@/theme/colors";

import { loadNextPage, useRecommendations } from "../hooks/useRecommendations";
import { NextPageFooter } from "./NextPageFooter";
import { RecommendationCard } from "./RecommendationCard";
import {
  type RecommendationActionHandlers,
  RecommendationsStatus,
} from "./RecommendationsStatus";

type RecommendationsListProps = {
  // The profile the customer is exploring for: its activities go first
  profileId: string | null;
  // false while the active profile is not known yet, so nothing is asked twice
  profileReady?: boolean;
  onOpen: (id: string) => void;
  // What to do when there are no recommendations (set the town, add a profile…)
  actions: RecommendationActionHandlers;
};

// Every recommendation, one page after another ("See all")
export function RecommendationsList({
  profileId,
  profileReady = true,
  onOpen,
  actions,
}: Readonly<RecommendationsListProps>) {
  const recommendations = useRecommendations(profileId, profileReady);

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

  const status = pages[0].status;
  if (status !== "OK") {
    return (
      <View style={styles.status}>
        <RecommendationsStatus status={status} actions={actions} />
      </View>
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
  status: { padding: 16 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 24 },
});
