
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useActiveProfile } from "../context/ActiveProfileProvider";
import type { FamilyProfile } from "../types";

export function ActiveProfileSelector() {
  const {
    activeProfile,
    activeProfileId,
    profiles,
    isLoading,
    isError,
    setActiveProfile,
  } = useActiveProfile();

  const [visible, setVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function selectProfile(profileId: string) {
    if (isSaving) return;

    setIsSaving(true);

    try {
      await setActiveProfile(profileId);
      setVisible(false);
    } catch {
      Alert.alert(
        "Error",
        "Could not save the active profile. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <ActivityIndicator accessibilityLabel="Loading profiles" />;
  }

  if (isError) {
    return <Text style={styles.placeholder}>Profiles unavailable</Text>;
  }

  if (!activeProfile) {
    return <Text style={styles.placeholder}>No profiles</Text>;
  }

  function renderProfile({
    item,
    index,
  }: {
    item: FamilyProfile;
    index: number;
  }) {
    const isActive = item.id === activeProfileId;
    const isMain = index === 0;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Select ${item.first_name}`}
        accessibilityState={{ selected: isActive }}
        disabled={isSaving}
        onPress={() => void selectProfile(item.id)}
        style={[
          styles.profileOption,
          isActive && styles.activeOption,
        ]}
      >
        <View style={styles.profileText}>
          <Text style={styles.profileName}>
            {item.first_name}
          </Text>

          {isMain && (
            <Text style={styles.mainLabel}>
              Main profile
            </Text>
          )}
        </View>

        {isActive && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </Pressable>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Active profile: ${activeProfile.first_name}. Change profile`}
        onPress={() => setVisible(true)}
        style={styles.headerButton}
      >
        <Text
          numberOfLines={1}
          style={styles.headerText}
        >
          {activeProfile.first_name} ▾
        </Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.title}>
              Switch active profile
            </Text>

            <Text style={styles.description}>
              Choose who is using AfterBell.
            </Text>

            <FlatList
              data={profiles}
              keyExtractor={(item) => item.id}
              renderItem={renderProfile}
              style={styles.list}
            />

            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => setVisible(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    maxHeight: "70%",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  list: {
    flexGrow: 0,
  },
  profileOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  activeOption: {
    backgroundColor: "#E5E7EB",
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  mainLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },
  checkmark: {
    fontSize: 20,
    color: "#111827",
    fontWeight: "700",
  },
  cancelButton: {
    marginTop: 16,
    alignSelf: "flex-end",
    padding: 10,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
});
