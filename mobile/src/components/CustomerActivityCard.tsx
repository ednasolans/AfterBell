import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ACTIVITY_TYPE_LABELS } from "@/lib/activityTypes";
import { type Activity, isFinished } from "@/lib/activity";
import { colors } from "@/theme/colors";
import { categoryLabel } from "@/lib/activityCategories";
import { type TimeSlot } from "@/lib/schedule";

import {
  formatActivityPrice,
  formatAgeSummary,
  formatDateRange,
  formatScheduleSummary,
} from "@/lib/activityFormat";
import { activityImage } from "@/lib/activityVisuals";

// What the card shows. The favourites list only has these fields, because
// customers cannot read activities that are no longer published.
export type CustomerCardActivity = Pick<
  Activity,
  | "id"
  | "title"
  | "category"
  | "type"
  | "startDate"
  | "endDate"
  | "targetAgeRanges"
  | "price"
  | "pricePeriod"
>;

type CustomerActivityCardProps = {
  activity: CustomerCardActivity;
  providerName: string | null;
  // A favourite that can no longer be opened: marked, and only its heart works
  unavailable?: boolean;
  // Not known in the favourites list
  schedule?: readonly TimeSlot[];
  // Names of the family profiles the activity fits (recommendations)
  suitableFor?: readonly string[];
  // A button drawn over the image, e.g. the favourite heart (another feature)
  accessory?: ReactNode;
  onPress: () => void;
};

// An activity as customers see it in a list
export function CustomerActivityCard({
  activity,
  providerName,
  unavailable = false,
  schedule = [],
  suitableFor = [],
  accessory,
  onPress,
}: Readonly<CustomerActivityCardProps>) {
  const image = activityImage(activity.category);
  const dates = formatDateRange(activity.startDate, activity.endDate);
  const ages = formatAgeSummary(activity.targetAgeRanges);
  const times = formatScheduleSummary(schedule);

  // The accessory sits over the card, not inside it: a button cannot contain
  // another button (invalid HTML on web, and screen readers would not reach it)
  return (
    <View style={[styles.wrapper, unavailable && styles.unavailable]}>
      <Pressable
        onPress={onPress}
        disabled={unavailable}
        accessibilityRole="button"
        accessibilityLabel={
          unavailable
            ? `${activity.title}, not available`
            : `Open ${activity.title}`
        }
        accessibilityState={{ disabled: unavailable }}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.imageWrap}>
          <Image
            source={image}
            style={styles.image}
            contentFit="cover"
            transition={180}
          />
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {categoryLabel(activity.category)}
            </Text>
          </View>
          {unavailable ? (
            <View style={styles.finishedBadge}>
              <Text style={styles.finishedText}>Not available</Text>
            </View>
          ) : null}
          {!unavailable && isFinished(activity) ? (
            <View style={styles.finishedBadge}>
              <Text style={styles.finishedText}>Finished</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{activity.title}</Text>
          {activity.type === "event" ? (
            <Text style={styles.typeLabel}>
              {ACTIVITY_TYPE_LABELS[activity.type]}
            </Text>
          ) : null}
          <View style={styles.providerRow}>
            <Text style={styles.provider} numberOfLines={1}>
              {providerName ?? ""}
            </Text>
            <Text style={styles.price}>
              {formatActivityPrice(activity.price, activity.pricePeriod)}
            </Text>
          </View>
          {suitableFor.length > 0 ? (
            <View style={styles.suitable}>
              <Ionicons
                name="people-outline"
                size={14}
                color={colors.primaryDark}
              />
              <Text style={styles.suitableText}>
                Suitable for {suitableFor.join(", ")}
              </Text>
            </View>
          ) : null}
          <View style={styles.chips}>
            {ages ? (
              <Text style={[styles.chip, styles.ageChip]}>{ages}</Text>
            ) : null}
            {times ? <IconChip icon="time-outline" text={times} /> : null}
            {dates ? <IconChip icon="calendar-outline" text={dates} /> : null}
          </View>
        </View>
      </Pressable>
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
    </View>
  );
}

function IconChip({
  icon,
  text,
}: {
  icon: "time-outline" | "calendar-outline";
  text: string;
}) {
  return (
    <View style={[styles.chip, styles.iconChip]}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  card: {
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    shadowColor: "#17342f",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pressed: { opacity: 0.8 },
  unavailable: { opacity: 0.6 },
  imageWrap: { height: 130, position: "relative" },
  image: { width: "100%", height: "100%" },
  categoryBadge: {
    position: "absolute",
    left: 12,
    top: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  categoryText: { color: colors.primaryDark, fontSize: 12, fontWeight: "800" },
  finishedBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    backgroundColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  finishedText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  accessory: { position: "absolute", right: 13, top: 13 },
  body: { padding: 16, gap: 8 },
  title: { fontSize: 18, fontWeight: "800", color: colors.text },
  typeLabel: { color: colors.primaryDark, fontWeight: "700" },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  provider: { flex: 1, color: colors.textMuted, fontSize: 14 },
  price: { color: colors.primaryDark, fontSize: 15, fontWeight: "800" },
  suitable: { flexDirection: "row", alignItems: "center", gap: 6 },
  suitableText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  chip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    overflow: "hidden",
  },
  ageChip: {
    backgroundColor: colors.primarySoft,
    color: colors.primaryDark,
    fontWeight: "700",
  },
  iconChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceMuted,
  },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
});
