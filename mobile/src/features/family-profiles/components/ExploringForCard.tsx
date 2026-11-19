import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

import { useActiveProfile } from "../context/ActiveProfileProvider";
import { profileAgeLabel } from "../profileAge";
import { ProfileSwitchModal } from "./ProfileSwitchModal";

type ExploringForCardProps = {
  // Without profiles, the card leads to the screen to add one
  onAddProfile: () => void;
};

// "Exploring for: Marc, Age 8" at the top of the home. Pressing it changes
// the active profile.
export function ExploringForCard({
  onAddProfile,
}: Readonly<ExploringForCardProps>) {
  const { activeProfile, isLoading, isError } = useActiveProfile();
  const [visible, setVisible] = useState(false);

  if (isLoading || isError) {
    return (
      <View style={styles.card}>
        <Avatar />
        <Text style={styles.muted}>
          {isLoading ? "Loading profiles…" : "Profiles unavailable"}
        </Text>
      </View>
    );
  }

  if (!activeProfile) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onAddProfile}
        style={styles.card}
      >
        <Avatar />
        <Text style={[styles.text, styles.grow]}>Add a family profile</Text>
        <Chevron name="add" />
      </Pressable>
    );
  }

  const age = profileAgeLabel(activeProfile, new Date());
  const who = age
    ? `${activeProfile.first_name}, ${age}`
    : activeProfile.first_name;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Exploring for ${who}. Change profile`}
        onPress={() => setVisible(true)}
        style={styles.card}
      >
        <Avatar />
        <Text style={[styles.text, styles.grow]} numberOfLines={1}>
          <Text style={styles.label}>Exploring for: </Text>
          {who}
        </Text>
        <Chevron name="chevron-down" />
      </Pressable>
      <ProfileSwitchModal visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

function Avatar() {
  return (
    <View style={styles.avatar}>
      <Ionicons name="happy-outline" size={24} color={colors.primaryDark} />
    </View>
  );
}

function Chevron({ name }: { name: "add" | "chevron-down" }) {
  return (
    <View style={styles.chevron}>
      <Ionicons name={name} size={18} color={colors.primaryDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fdf1d6",
    alignItems: "center",
    justifyContent: "center",
  },
  grow: { flex: 1 },
  text: { color: colors.text, fontSize: 15, fontWeight: "800" },
  label: { fontWeight: "700" },
  muted: { color: colors.textMuted },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
});
