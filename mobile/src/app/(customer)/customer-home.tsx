
import { Text, View, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import LogoutButton from "@/components/LogoutButton";

export default function CustomerHomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer home</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/family-profiles")}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          My family profiles
        </Text>
      </Pressable>

      <LogoutButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
