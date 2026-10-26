import { Alert, FlatList, Pressable, StyleSheet, Text } from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { LoadingView } from "@/components/LoadingView";
import { formatAddress } from "@/lib/addresses";

import { useDeleteActivity } from "../hooks/useDeleteActivity";
import { useMyActivities } from "../hooks/useMyActivities";
import { useMyAddresses } from "../hooks/useMyAddresses";
import { type Activity } from "../types";
import { ActivityCard } from "./ActivityCard";

type MyActivitiesListProps = {
  onCreate: () => void;
  onEdit: (id: string) => void;
};

export function MyActivitiesList({ onCreate, onEdit }: MyActivitiesListProps) {
  const activities = useMyActivities();
  const deleteActivity = useDeleteActivity();
  // Only used to show where each activity takes place: while they load,
  // or if they fail, the cards are shown without the address
  const addresses = useMyAddresses();
  const addressById = new Map(
    (addresses.data ?? []).map((address) => [
      address.id,
      formatAddress(address),
    ]),
  );

  // Deleting cannot be undone, so the provider has to confirm it
  function confirmDelete(activity: Activity) {
    Alert.alert(
      "Delete activity",
      `Do you want to delete "${activity.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteActivity.mutate(activity.id),
        },
      ],
    );
  }

  if (activities.isPending) {
    return <LoadingView />;
  }

  if (activities.isError) {
    return (
      <ErrorView
        message="Your activities could not be loaded."
        onRetry={() => activities.refetch()}
      />
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={activities.data}
      keyExtractor={(activity) => activity.id}
      ListHeaderComponent={
        <>
          <Pressable
            onPress={onCreate}
            accessibilityRole="button"
            style={styles.createButton}
          >
            <Text style={styles.createButtonText}>New activity</Text>
          </Pressable>
          {deleteActivity.isError ? (
            <Text style={styles.error}>
              The activity could not be deleted. Please try again.
            </Text>
          ) : null}
        </>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          You have no activities yet. Create your first one!
        </Text>
      }
      renderItem={({ item }) => (
        <ActivityCard
          activity={item}
          address={item.addressId ? addressById.get(item.addressId) : undefined}
          onEdit={() => onEdit(item.id)}
          onDelete={() => confirmDelete(item)}
          isDeleting={
            deleteActivity.isPending && deleteActivity.variables === item.id
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  createButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#2563eb",
    marginBottom: 16,
  },
  createButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#c00", textAlign: "center", marginBottom: 12 },
  empty: { textAlign: "center", color: "#888", marginTop: 24 },
});
