import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import LoadingButton from "@/components/LoadingButton";
import { authStyles } from "@/features/auth/authStyles";

// Cover screen: the entry point for users without a session.
// Signed-in users never see it: AuthGate sends them to their own area.
export default function Index() {
  const router = useRouter();

  return (
    <View style={authStyles.container}>
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>A</Text>
      </View>
      <Text style={authStyles.title}>AfterBell</Text>
      <Text style={styles.tagline}>Discover something great to do today.</Text>

      <LoadingButton label="Log in" onPress={() => router.push("/login")} />
      <LoadingButton
        label="Sign up"
        variant="outline"
        onPress={() => router.push("/sign-up")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  brandMark: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#0d9b8e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  brandMarkText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  tagline: { marginBottom: 16, color: "#6b7d78", fontSize: 16, lineHeight: 23 },
});
