import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import LogoutButton from "@/components/LogoutButton";
import { colors } from "@/theme/colors";

export default function ProviderHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>PROVIDER SPACE</Text>
      <Text style={styles.title}>Grow your community</Text>
      <Text style={styles.subtitle}>
        Manage your activities and public profile.
      </Text>
      <LogoutButton />
      <View style={styles.card}>
        <Link href="/activities" style={styles.link}>
          My activities
        </Link>
        <Text style={styles.cardText}>
          Create and manage the activities you offer.
        </Text>
      </View>
      <View style={styles.card}>
        <Link href="/ai-profile" style={styles.link}>
          AI profile
        </Link>
        <Text style={styles.cardText}>
          Turn your technical sheet into a profile.
        </Text>
      </View>
      <View style={styles.card}>
        <Link href="/technical-sheet" style={styles.link}>
          Technical sheet
        </Link>
        <Text style={styles.cardText}>
          Describe your centre: addresses, contact and facilities.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    backgroundColor: colors.background,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 16, marginBottom: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  link: { color: colors.primaryDark, fontSize: 18, fontWeight: "800" },
  cardText: { color: colors.textMuted, lineHeight: 20 },
});
