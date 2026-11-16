import { Ionicons } from "@expo/vector-icons";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { LoadingView } from "@/components/LoadingView";
import { colors } from "@/theme/colors";

import { useFavourites } from "../hooks/useFavourites";
import { CatalogActivityCard } from "./CatalogActivityCard";

type FavouritesListProps = {
  onOpen: (id: string) => void;
  onExplore: () => void;
};

// The activities saved by the customer. The ones that can no longer be opened
// stay, marked, so they do not disappear without notice.
export function FavouritesList({
  onOpen,
  onExplore,
}: Readonly<FavouritesListProps>) {
  const favourites = useFavourites();

  if (favourites.isPending) {
    return <LoadingView />;
  }

  if (favourites.isError) {
    return (
      <ErrorView
        message="Your favourites could not be loaded."
        onRetry={() => favourites.refetch()}
      />
    );
  }

  return (
    <FlatList
      testID="favourites-list"
      style={styles.list}
      contentContainerStyle={styles.container}
      data={favourites.data}
      keyExtractor={(item) => item.activity.id}
      refreshing={favourites.isRefetching}
      onRefresh={() => favourites.refetch()}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            You have not saved any activities yet.
          </Text>
          <Pressable accessibilityRole="button" onPress={onExplore}>
            <Text style={styles.link}>Browse activities</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <CatalogActivityCard
          activity={item.activity}
          providerName={item.providerName}
          isFavourite
          unavailable={!item.available}
          onPress={() => onOpen(item.activity.id)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.background },
  container: { padding: 16, paddingTop: 8 },
  empty: { alignItems: "center", gap: 8, marginTop: 32 },
  emptyText: { color: colors.textMuted },
  link: { color: colors.primaryDark, fontWeight: "700" },
});
