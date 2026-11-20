import { type ReactElement } from "react";
import { FlatList, StyleSheet, Text } from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { LoadingView } from "@/components/LoadingView";
import { colors } from "@/theme/colors";

import { useCatalogActivities } from "../hooks/useCatalogActivities";
import { CatalogActivityCard } from "./CatalogActivityCard";
import { ListStateView } from "./ListStateView";

type CatalogListProps = {
  onOpen: (id: string) => void;
  // Shown above the activities, and scrolled with them
  header?: ReactElement;
};

export function CatalogList({ onOpen, header }: Readonly<CatalogListProps>) {
  const activities = useCatalogActivities();

  if (activities.isPending) {
    return (
      <ListStateView header={header}>
        <LoadingView />
      </ListStateView>
    );
  }

  if (activities.isError) {
    console.error("Catalog error:", activities.error);
    return (
      <ListStateView header={header}>
        <ErrorView
          message="Activities could not be loaded."
          onRetry={() => activities.refetch()}
        />
      </ListStateView>
    );
  }

  return (
    <FlatList
      testID="catalog-list"
      contentContainerStyle={styles.container}
      style={styles.list}
      data={activities.data}
      keyExtractor={(item) => item.activity.id}
      refreshing={activities.isRefetching}
      onRefresh={() => activities.refetch()}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <Text style={styles.empty}>There are no activities available yet.</Text>
      }
      renderItem={({ item }) => (
        <CatalogActivityCard
          activity={item.activity}
          providerName={item.provider.contact?.name ?? null}
          isFavourite={item.isFavourite}
          schedule={item.activity.schedule}
          onPress={() => onOpen(item.activity.id)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.background },
  container: { padding: 16, paddingTop: 0 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 24 },
});
