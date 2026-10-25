import { Pressable, StyleSheet, Text } from "react-native";

import { formatPriceRange } from "@/lib/price";

import { formatAgeRanges } from "../format";
import { type CatalogActivity } from "../types";

type CatalogActivityCardProps = {
  item: CatalogActivity;
  onPress: () => void;
};

export function CatalogActivityCard({
  item,
  onPress,
}: Readonly<CatalogActivityCardProps>) {
  const { activity, provider } = item;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${activity.title}`}
      style={styles.card}
    >
      <Text style={styles.title}>{activity.title}</Text>
      {provider.contact ? (
        <Text style={styles.provider}>{provider.contact.name}</Text>
      ) : null}
      <Text style={styles.detail}>
        {`Ages: ${formatAgeRanges(activity.targetAgeRanges)}`}
      </Text>
      <Text style={styles.detail}>
        {formatPriceRange(
          activity.priceMin,
          activity.priceMax,
          activity.pricePeriod,
        )}
      </Text>
    </Pressable>
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
  provider: { color: "#2563eb", fontWeight: "600" },
  detail: { color: "#444" },
});