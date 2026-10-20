import { Pressable, StyleSheet, Text, View } from "react-native";

type ErrorViewProps = {
  message: string;
  onRetry: () => void;
};

// Full-screen error with a button to try again
export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        style={styles.button}
      >
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 12,
  },
  message: { textAlign: "center", color: "#c00" },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#2563eb",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
