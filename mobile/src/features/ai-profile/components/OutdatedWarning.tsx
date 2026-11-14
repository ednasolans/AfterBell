import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type OutdatedWarningProps = {
  onRegenerate: () => void;
};

// Same amber tones as the draft badge (ProfileStatusBadge)
// Shown when the technical sheet changed after the AI wrote the profile
export function OutdatedWarning({ onRegenerate }: OutdatedWarningProps) {
  return (
    <View style={styles.card} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={22} color="#92400e" />
      <View style={styles.body}>
        <Text style={styles.text}>
          Your technical sheet changed after this profile was written. It may
          not describe your organisation as it is now.
        </Text>
        <Pressable
          onPress={onRegenerate}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.link}>Regenerate now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fef3c7",
    marginBottom: 12,
  },
  body: { flex: 1, gap: 8 },
  text: { color: "#92400e", lineHeight: 20 },
  link: { color: "#92400e", fontWeight: "800" },
});
