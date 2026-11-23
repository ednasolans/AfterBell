import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

import {
  EMPTY_RECOMMENDATIONS,
  RECOMMENDATION_ACTION_LABELS,
  type EmptyRecommendationStatus,
  type RecommendationAction,
} from "../statusMessages";

export type RecommendationActionHandlers = Record<
  RecommendationAction,
  () => void
>;

type RecommendationsStatusProps = {
  status: EmptyRecommendationStatus;
  actions: RecommendationActionHandlers;
};

// Why there are no recommendations, with what the customer can do about it
export function RecommendationsStatus({
  status,
  actions,
}: Readonly<RecommendationsStatusProps>) {
  const { message, actions: available } = EMPTY_RECOMMENDATIONS[status];

  return (
    <View style={styles.box}>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        {available.map((action) => (
          <Pressable
            key={action}
            accessibilityRole="button"
            onPress={actions[action]}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>
              {RECOMMENDATION_ACTION_LABELS[action]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  message: { color: colors.text, fontSize: 15, lineHeight: 21 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  pressed: { opacity: 0.7 },
  buttonText: { color: colors.primaryDark, fontWeight: "700" },
});
