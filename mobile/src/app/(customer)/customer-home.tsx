import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import LogoutButton from "@/components/LogoutButton";
import { CatalogList } from "@/features/catalog/components/CatalogList";
import { colors } from "@/theme/colors";

// Home of the customer area: access to the family profiles and the list of activities
export default function CustomerHomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi there!</Text>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>What shall we</Text>
            <Text style={styles.title}>explore today?</Text>
          </View>
          <View style={styles.avatar}>
            <Ionicons
              name="person-outline"
              size={22}
              color={colors.primaryDark}
            />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/family-profiles")}
          style={styles.button}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={colors.primaryDark}
          />
          <Text style={styles.buttonText}>My family profiles</Text>
        </Pressable>
      </View>

      <CatalogList
        onOpen={(id) =>
          router.push({ pathname: "/activities/[id]", params: { id } })
        }
      />

      <View style={styles.footer}>
        <View style={styles.bottomNav}>
          <View style={[styles.navItem, styles.navItemActive]}>
            <Ionicons name="compass" size={21} color={colors.primaryDark} />
            <Text style={styles.navActiveText}>Explore</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open family profiles"
            onPress={() => router.push("/family-profiles")}
            style={styles.navItem}
          >
            <Ionicons
              name="people-outline"
              size={21}
              color={colors.textMuted}
            />
            <Text style={styles.navText}>Family</Text>
          </Pressable>
          <View style={styles.navItem}>
            <Ionicons
              name="bookmark-outline"
              size={21}
              color={colors.textMuted}
            />
            <Text style={styles.navText}>Saved</Text>
          </View>
          <LogoutButton />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  greeting: { color: colors.primaryDark, fontWeight: "700", fontSize: 14 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: 27,
    fontWeight: "800",
    marginTop: 4,
    lineHeight: 31,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    backgroundColor: colors.primarySoft,
    padding: 13,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  bottomNav: {
    minHeight: 68,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
  },
  navItem: { alignItems: "center", gap: 3, minWidth: 58 },
  navItemActive: {
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    paddingVertical: 6,
  },
  navActiveText: { color: colors.primaryDark, fontSize: 11, fontWeight: "800" },
  navText: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
});
