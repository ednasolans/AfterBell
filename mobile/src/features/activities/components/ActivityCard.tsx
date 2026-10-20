import { Pressable, StyleSheet, Text, View } from "react-native";

import { ACTIVITY_CATEGORY_LABELS } from "@/lib/activityCategories";
import { formatPriceRange } from "@/lib/price";
import { formatTimeSlot } from "@/lib/schedule";

import { type Activity } from "../types";

type ActivityCardProps = {
  activity: Activity;
  // Text of the address where it takes place, if it is already known
  address?: string;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
};

export function ActivityCard({
  activity,
  address,
  onEdit,
  onDelete,
  isDeleting,
}: ActivityCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{activity.title}</Text>
      <Text style={styles.detail}>
        {ACTIVITY_CATEGORY_LABELS[activity.category]}
      </Text>
      {address ? <Text style={styles.detail}>{address}</Text> : null}
      <Text style={styles.detail}>
        {activity.schedule.map(formatTimeSlot).join(", ")}
      </Text>
      <Text style={styles.detail}>
        {formatPriceRange(
          activity.priceMin,
          activity.priceMax,
          activity.pricePeriod,
        )}
      </Text>
      <Text style={styles.detail}>Up to {activity.maxParticipants} people</Text>

      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${activity.title}`}
          style={styles.button}
        >
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          disabled={isDeleting}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${activity.title}`}
          accessibilityState={{ disabled: isDeleting, busy: isDeleting }}
          style={[styles.button, isDeleting && styles.buttonDisabled]}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 12,
    gap: 4,
  },
  title: { fontSize: 17, fontWeight: "700" },
  detail: { color: "#444" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 16 },
  button: { paddingVertical: 6, paddingHorizontal: 4 },
  buttonDisabled: { opacity: 0.4 },
  editText: { color: "#2563eb", fontWeight: "600" },
  deleteText: { color: "#c00", fontWeight: "600" },
});
