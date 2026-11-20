import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "@/theme/colors";

type NextPageFooterProps = {
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
};

// At the end of a list: a spinner while the next page loads, or a retry if it failed
export function NextPageFooter({
  loading,
  failed,
  onRetry,
}: Readonly<NextPageFooterProps>) {
  if (loading) {
    return (
      <ActivityIndicator
        style={styles.footer}
        accessibilityLabel="Loading more recommendations"
      />
    );
  }
  if (failed) {
    return (
      <View style={styles.footer}>
        <Text style={styles.message}>
          More recommendations could not be loaded.
        </Text>
        <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
          <Text style={styles.retry}>Try again</Text>
        </Pressable>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  footer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 6,
  },
  message: { color: colors.textMuted, textAlign: "center", maxWidth: 200 },
  retry: { color: colors.primaryDark, fontWeight: "700" },
});
