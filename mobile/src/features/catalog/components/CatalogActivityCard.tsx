import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ACTIVITY_TYPE_LABELS } from "@/lib/activityTypes";
import { isFinished } from "@/lib/activity";
import { colors } from "@/theme/colors";
import { categoryLabel } from "@/lib/activityCategories";

import {
  formatActivityPrice,
  formatAgeRanges,
  formatDateRange,
} from "../format";
import { type CatalogCardActivity } from "../types";
import { activityImage } from "../visuals";
import { FavouriteButton } from "./FavouriteButton";

type CatalogActivityCardProps = {
  activity: CatalogCardActivity;
  providerName: string | null;
  isFavourite: boolean;
  // A favourite that can no longer be opened: marked, and only its heart works
  unavailable?: boolean;
  onPress: () => void;
};

export function CatalogActivityCard({
  activity,
  providerName,
  isFavourite,
  unavailable = false,
  onPress,
}: Readonly<CatalogActivityCardProps>) {
  const image = activityImage(activity.category);
  const dates = formatDateRange(activity.startDate, activity.endDate);

  // The heart sits over the card, not inside it: a button cannot contain
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
          {providerName ? (
            <View style={styles.providerRow}>
              <Ionicons
                name="business-outline"
                size={15}
                color={colors.primaryDark}
              />
              <Text style={styles.provider}>{providerName}</Text>
            </View>
          ) : null}
          {dates ? (
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={colors.textMuted}
              />
              <Text style={styles.detail}>{dates}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons
                name="people-outline"
                size={15}
                color={colors.textMuted}
              />
              <Text style={styles.detail}>
                {`Ages: ${formatAgeRanges(activity.targetAgeRanges)}`}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons
                name="pricetag-outline"
                size={15}
                color={colors.textMuted}
              />
              <Text style={styles.detail}>
                {formatActivityPrice(activity.price, activity.pricePeriod)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
      <View style={styles.favourite}>
        <FavouriteButton
          activityId={activity.id}
          activityTitle={activity.title}
          isFavourite={isFavourite}
        />
      </View>
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
  imageWrap: { height: 148, position: "relative" },
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
  favourite: { position: "absolute", right: 13, top: 13 },
  body: { padding: 16, gap: 8 },
  title: { fontSize: 18, fontWeight: "800", color: colors.text },
  typeLabel: { color: colors.primaryDark, fontWeight: "700" },
  providerRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  provider: { color: colors.primaryDark, fontWeight: "700" },
  metaRow: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  detail: { color: colors.textMuted, fontSize: 14 },
});
