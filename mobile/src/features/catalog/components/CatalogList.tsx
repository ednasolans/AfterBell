import { FlatList, StyleSheet, Text } from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { LoadingView } from "@/components/LoadingView";
import { colors } from "@/theme/colors";

import { useCatalogActivities } from "../hooks/useCatalogActivities";
import { CatalogActivityCard } from "./CatalogActivityCard";

type CatalogListProps = {
  onOpen: (id: string) => void;
};

export function CatalogList({ onOpen }: Readonly<CatalogListProps>) {
  const activities = useCatalogActivities();

  if (activities.isPending) {
    return <LoadingView />;
  }

  if (activities.isError) {
    console.error("Catalog error:", activities.error);
    return (
      <ErrorView
        message="Activities could not be loaded."
        onRetry={() => activities.refetch()}
      />
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
      ListEmptyComponent={
        <Text style={styles.empty}>There are no activities available yet.</Text>
      }
      renderItem={({ item }) => (
        <CatalogActivityCard
          item={item}
          onPress={() => onOpen(item.activity.id)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.background },
  container: { padding: 16, paddingTop: 8 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 24 },
});
