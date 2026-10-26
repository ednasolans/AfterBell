import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import LogoutButton from "@/components/LogoutButton";
import { CatalogList } from "@/features/catalog/components/CatalogList";

// Home of the customer area: access to the family profiles and the list of activities
export default function CustomerHomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/family-profiles")}
          style={styles.button}
        >
          <Text style={styles.buttonText}>My family profiles</Text>
        </Pressable>
      </View>

      <CatalogList
        onOpen={(id) =>
          router.push({ pathname: "/activities/[id]", params: { id } })
        }
      />

      <View style={styles.footer}>
        <LogoutButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16 },
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
  footer: { paddingHorizontal: 16, paddingBottom: 16 },
});