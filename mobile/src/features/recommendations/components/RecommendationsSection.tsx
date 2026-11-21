import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { colors } from "@/theme/colors";

import { loadNextPage, useRecommendations } from "../hooks/useRecommendations";
import { NextPageFooter } from "./NextPageFooter";
import { RecommendationCard } from "./RecommendationCard";
import {
  type RecommendationActionHandlers,
  RecommendationsStatus,
} from "./RecommendationsStatus";

// Wide enough to read the card, narrow enough to show that the row scrolls
const CARD_WIDTH = 280;

type RecommendationsSectionProps = {
  // The profile the customer is exploring for: its activities go first
  profileId: string | null;
  // false while the active profile is not known yet, so nothing is asked twice
  profileReady?: boolean;
  onOpen: (id: string) => void;
  onSeeAll: () => void;
  // What to do when there are no recommendations (set the town, add a profile…)
  actions: RecommendationActionHandlers;
};

// "Recommended for you" on the home of the customer: a row of the activities
// that fit the family, in the order of the backend (more profiles, closer,
// newer). Without recommendations, it says why and what to do (#109).
export function RecommendationsSection({
  profileId,
  profileReady = true,
  onOpen,
  onSeeAll,
  actions,
}: Readonly<RecommendationsSectionProps>) {
  const recommendations = useRecommendations(profileId, profileReady);

  if (recommendations.isPending) {
    return (
      <View style={styles.section}>
        <SectionTitle />
        <ActivityIndicator
          style={styles.loading}
          accessibilityLabel="Loading recommendations"
        />
      </View>
    );
  }

  // A later page that fails keeps the loaded ones: its footer offers a retry
  const pages = recommendations.data?.pages;
  if (!pages) {
    return (
      <View style={styles.section}>
        <SectionTitle />
        <ErrorView
          message="Your recommendations could not be loaded."
          onRetry={() => void recommendations.refetch()}
        />
      </View>
    );
  }

  // The first page says whether data is missing or nothing fits
  const status = pages[0].status;
  if (status !== "OK") {
    return (
      <View style={styles.section}>
        <SectionTitle />
        <RecommendationsStatus status={status} actions={actions} />
      </View>
    );
  }

  const items = pages.flatMap((page) => page.recommendations);
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <SectionTitle />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="See all recommendations"
          onPress={onSeeAll}
          hitSlop={8}
        >
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      <FlatList
        testID="recommendations-row"
        horizontal
        showsHorizontalScrollIndicator={false}
        data={items}
        keyExtractor={(item) => item.activity.id}
        ItemSeparatorComponent={Separator}
        onEndReachedThreshold={0.5}
        onEndReached={() => loadNextPage(recommendations)}
        ListFooterComponent={
          <NextPageFooter
            loading={recommendations.isFetchingNextPage}
            failed={recommendations.isFetchNextPageError}
            onRetry={() => void recommendations.fetchNextPage()}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <RecommendationCard recommendation={item} onOpen={onOpen} />
          </View>
        )}
      />
    </View>
  );
}

function SectionTitle() {
  return (
    <Text style={styles.title} accessibilityRole="header">
      Recommended for you
    </Text>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  section: { marginBottom: 8 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
  },
  seeAll: { color: colors.primaryDark, fontWeight: "700", marginBottom: 10 },
  loading: { paddingVertical: 24 },
  card: { width: CARD_WIDTH },
  separator: { width: 12 },
});
