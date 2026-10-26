import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
import { ACTIVITY_CATEGORY_LABELS } from "@/lib/activityCategories";

import { formatAgeRanges, formatActivityPrice } from "../format";
import { type CatalogActivity } from "../types";
import { ACTIVITY_IMAGES } from "../visuals";

type CatalogActivityCardProps = {
  item: CatalogActivity;
  onPress: () => void;
};

export function CatalogActivityCard({
  item,
  onPress,
}: Readonly<CatalogActivityCardProps>) {
  const { activity, provider } = item;
  const image = ACTIVITY_IMAGES[activity.category];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${activity.title}`}
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
            {ACTIVITY_CATEGORY_LABELS[activity.category]}
          </Text>
        </View>
        <View style={styles.bookmark}>
          <Ionicons name="heart-outline" size={18} color={colors.text} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{activity.title}</Text>
        {provider.contact ? (
          <View style={styles.providerRow}>
            <Ionicons
              name="business-outline"
              size={15}
              color={colors.primaryDark}
            />
            <Text style={styles.provider}>{provider.contact.name}</Text>
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
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#17342f",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  pressed: { opacity: 0.8 },
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
  bookmark: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 16, gap: 8 },
  title: { fontSize: 18, fontWeight: "800", color: colors.text },
  providerRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  provider: { color: colors.primaryDark, fontWeight: "700" },
  metaRow: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  detail: { color: colors.textMuted, fontSize: 14 },
});
