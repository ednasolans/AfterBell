import { ActivityIndicator, StyleSheet, View } from "react-native";

// Full-screen spinner while data is loading
export function LoadingView() {
  return (
    <View
      style={styles.container}
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
