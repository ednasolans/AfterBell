import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  formatAgeRanges,
  formatActivityPrice,
} from "@/features/catalog/format";

import { type Activity } from "@/lib/activity";
import { colors } from "@/theme/colors";
import { categoryLabel } from "@/lib/activityCategories";
import { ACTIVITY_STATUS_LABELS } from "@/lib/activityStatus";
import { activityImage } from "@/features/catalog/visuals";
import { Image } from "expo-image";

import { ACTIVITY_TYPE_LABELS } from "../types";

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
      <View style={styles.imageWrap}>
        <Image
          source={activityImage(activity.category)}
          style={styles.image}
          contentFit="cover"
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {categoryLabel(activity.category)}
          </Text>
        </View>
        <View
          style={[
            styles.status,
            activity.status === "published" && styles.statusPublished,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              activity.status === "published" && styles.statusTextPublished,
            ]}
          >
            {ACTIVITY_STATUS_LABELS[activity.status]}
          </Text>
        </View>
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{activity.title}</Text>
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={colors.textMuted}
          />
        </View>
        <View style={styles.metaRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={colors.primaryDark}
          />
          <Text style={styles.detail}>
            {ACTIVITY_TYPE_LABELS[activity.type]}
          </Text>
        </View>
        {address ? (
          <View style={styles.metaRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={colors.primaryDark}
            />
            <Text style={styles.detail}>{address}</Text>
          </View>
        ) : null}
        <Text style={styles.detail}>
          {`Ages: ${formatAgeRanges(activity.targetAgeRanges)}`}
        </Text>
        {activity.schedule.length > 0 ? (
          <Text style={styles.detail}>
            {" "}
            {activity.schedule
              .map((slot) => `${slot.day} ${slot.startTime}–${slot.endTime}`)
              .join(", ")}
          </Text>
        ) : null}
        <Text style={styles.detail}>
          {formatActivityPrice(activity.price, activity.pricePeriod)}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${activity.title}`}
          style={[styles.button, styles.editButton]}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={colors.primaryDark}
          />
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          disabled={isDeleting}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${activity.title}`}
          accessibilityState={{ disabled: isDeleting, busy: isDeleting }}
          style={[
            styles.button,
            styles.deleteButton,
            isDeleting && styles.buttonDisabled,
          ]}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginBottom: 14,
  },
  imageWrap: { height: 116, position: "relative" },
  image: { width: "100%", height: "100%" },
  badge: {
    position: "absolute",
    left: 12,
    top: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: colors.white,
  },
  badgeText: { color: colors.primaryDark, fontSize: 11, fontWeight: "800" },
  // Draft or Published, in the opposite corner to the category
  status: {
    position: "absolute",
    right: 12,
    top: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: colors.surfaceMuted,
  },
  statusPublished: { backgroundColor: colors.primarySoft },
  statusText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  statusTextPublished: { color: colors.primaryDark },
  content: { padding: 15, gap: 6 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { flex: 1, fontSize: 18, fontWeight: "800", color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detail: { color: colors.textMuted },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  button: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  editButton: { backgroundColor: colors.primarySoft },
  deleteButton: { backgroundColor: "#fff0f0" },
  buttonDisabled: { opacity: 0.4 },
  editText: { color: colors.primaryDark, fontWeight: "700" },
  deleteText: { color: colors.danger, fontWeight: "700" },
});
