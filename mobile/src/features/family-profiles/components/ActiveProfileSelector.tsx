import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { useActiveProfile } from "../context/ActiveProfileProvider";
import { ProfileSwitchModal } from "./ProfileSwitchModal";

export function ActiveProfileSelector() {
  const { activeProfile, isLoading, isError } = useActiveProfile();

  const [visible, setVisible] = useState(false);

  if (isLoading) {
    return <ActivityIndicator accessibilityLabel="Loading profiles" />;
  }

  if (isError) {
    return <Text style={styles.placeholder}>Profiles unavailable</Text>;
  }

  if (!activeProfile) {
    return <Text style={styles.placeholder}>No profiles</Text>;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Active profile: ${activeProfile.first_name}. Change profile`}
        onPress={() => setVisible(true)}
        style={styles.headerButton}
      >
        <Text numberOfLines={1} style={styles.headerText}>
          {activeProfile.first_name} ▾
        </Text>
      </Pressable>

      <ProfileSwitchModal visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 155,
  },
  headerText: {
    color: "#1F2937",
    fontSize: 15,
    fontWeight: "600",
  },
  placeholder: {
    color: "#6B7280",
    fontSize: 12,
  },
});
