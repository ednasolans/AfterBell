import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

import { formatPlaces, isFullActivity } from "../enrolmentRules";
import { useActivityPlaces } from "../hooks/useActivityPlaces";

type ActivityPlacesCounterProps = {
  activityId: string;
  // Opens the requests of this activity
  onPress: () => void;
};

// "Places: 8 / 12" in a card of "My activities". It is a nice-to-have: while
// the places load, or if they fail, the card is shown without it.
export function ActivityPlacesCounter({
  activityId,
  onPress,
}: Readonly<ActivityPlacesCounterProps>) {
  const places = useActivityPlaces();
  const item = places.data?.find((place) => place.activityId === activityId);
  if (!item) {
    return null;
  }

  const full = isFullActivity(item);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Places taken: ${formatPlaces(item)}${full ? ", full" : ""}. Open the requests`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      hitSlop={6}
    >
      <Ionicons name="people-outline" size={16} color={colors.primaryDark} />
      <Text style={styles.text}>{`Places: ${formatPlaces(item)}`}</Text>
      {full ? (
        <View style={styles.full}>
          <Text style={styles.fullText}>Full</Text>
        </View>
      ) : null}
      <Text style={styles.link}>Requests</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingVertical: 6,
  },
  pressed: { opacity: 0.6 },
  text: { color: colors.text, fontWeight: "700" },
  full: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  fullText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  link: {
    marginLeft: "auto",
    color: colors.primaryDark,
    fontWeight: "700",
  },
});
