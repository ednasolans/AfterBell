import { router } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";

import { FamilyLocationCard } from "@/features/family-profiles/components/FamilyLocationCard";
import { colors } from "@/theme/colors";

// Opened to set the town (e.g. from the recommendations): back after saving
export default function FamilyLocationScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <FamilyLocationCard initiallyEditing onSaved={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.background, flexGrow: 1 },
});
