import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import LogoutButton from "@/components/LogoutButton";
import { CatalogSearch } from "@/features/catalog/components/CatalogSearch";
import { ExploringForCard } from "@/features/family-profiles/components/ExploringForCard";
import { useActiveProfile } from "@/features/family-profiles/context/ActiveProfileProvider";
import { useActiveProfileAges } from "@/features/family-profiles/hooks/useActiveProfileAges";
import { RecommendationsSection } from "@/features/recommendations/components/RecommendationsSection";
import { colors } from "@/theme/colors";

// Home of the customer area: who the family is exploring for, the activities
// recommended for the family, and the list and search of activities for that
// profile's age
export default function CustomerHomeScreen() {
  const router = useRouter();
  const profileAges = useActiveProfileAges();
  const activeProfile = useActiveProfile();
  const openActivity = (id: string) =>
    router.push({ pathname: "/activities/[id]", params: { id } });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colors.white}
            />
          </View>
          <Text style={styles.brand}>AfterBell</Text>
        </View>
        <ExploringForCard
          onAddProfile={() => router.push("/family-profiles")}
        />
        <Text style={styles.title} accessibilityRole="header">
          What shall we explore today?
        </Text>
      </View>

      <CatalogSearch
        profileAges={profileAges}
        onOpen={openActivity}
        listHeader={
          <RecommendationsSection
            profileId={activeProfile.activeProfileId}
            profileReady={!activeProfile.isLoading}
            onOpen={openActivity}
            onSeeAll={() => router.push("/recommendations")}
          />
        }
      />

      <View style={styles.footer}>
        <View style={styles.bottomNav}>
          <View style={styles.navItem}>
            <View style={styles.navItemActive}>
              <Ionicons name="home" size={21} color={colors.primaryDark} />
            </View>
            <Text style={styles.navActiveText}>Home</Text>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open my requests"
            onPress={() => router.push("/my-requests")}
            style={styles.navItem}
          >
            <Ionicons
              name="document-text-outline"
              size={21}
              color={colors.textMuted}
            />
            <Text style={styles.navText}>Requests</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open favourites"
            onPress={() => router.push("/favourites")}
            style={styles.navItem}
          >
            <Ionicons name="heart-outline" size={21} color={colors.textMuted} />
            <Text style={styles.navText}>Favourites</Text>
          </Pressable>
          <LogoutButton />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 12, gap: 14 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { color: colors.text, fontSize: 22, fontWeight: "800" },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 31,
    marginBottom: 4,
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
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  navActiveText: { color: colors.primaryDark, fontSize: 11, fontWeight: "800" },
  navText: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
});
