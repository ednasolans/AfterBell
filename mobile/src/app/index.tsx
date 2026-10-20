import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AfterBell</Text>
      <Text>Mobile application</Text>

      <Link href="/login" style={styles.link}>
        Login
      </Link>

      <Link href="/sign-up" style={styles.link}>
        Sign up
      </Link>

      <Link href="/customer-home" style={styles.link}>
        Customer
      </Link>

      <Link href="/provider-home" style={styles.link}>
        Provider
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  link: {
    color: "#208AEF",
    fontSize: 16,
  },
});
