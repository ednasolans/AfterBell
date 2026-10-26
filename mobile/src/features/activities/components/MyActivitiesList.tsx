import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { LoadingView } from "@/components/LoadingView";
import { formatAddress } from "@/lib/addresses";
import { type Activity } from "@/lib/activity";

import { useDeleteActivity } from "../hooks/useDeleteActivity";
import { useMyActivities } from "../hooks/useMyActivities";
import { useMyAddresses } from "../hooks/useMyAddresses";
import { ActivityCard } from "./ActivityCard";
import { colors } from "@/theme/colors";

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
        <View>
          <Text style={styles.eyebrow}>YOUR SPACE</Text>
          <Text style={styles.title}>My activities</Text>
          <Text style={styles.subtitle}>
            Keep your offer fresh and easy to discover.
          </Text>
          <Pressable
            onPress={onCreate}
            accessibilityRole="button"
            style={styles.createButton}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={colors.white}
            />
            <Text style={styles.createButtonText}>New activity</Text>
          </Pressable>
          {deleteActivity.isError ? (
            <Text style={styles.error}>
              The activity could not be deleted. Please try again.
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="sparkles-outline"
              size={32}
              color={colors.primaryDark}
            />
          </View>
          <Text style={styles.emptyTitle}>Your offer starts here</Text>
          <Text style={styles.emptyText}>
            You have no activities yet. Create your first one!
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <ActivityCard
          activity={item}
          address={addressById.get(item.addressId)}
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
  container: { padding: 16, backgroundColor: colors.background, flexGrow: 1 },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", marginTop: 4 },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 6,
    marginBottom: 18,
  },
  createButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: colors.primary,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  createButtonText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  error: { color: colors.danger, textAlign: "center", marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 42, paddingHorizontal: 24 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyText: { color: colors.textMuted, textAlign: "center", lineHeight: 21 },
});
