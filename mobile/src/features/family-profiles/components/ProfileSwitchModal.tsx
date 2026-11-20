import { useState } from "react";
import {
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

type ProfileSwitchModalProps = {
  visible: boolean;
  onClose: () => void;
};

// The list of the family profiles to choose the active one. Shared by the
// header selector and the "Exploring for" card of the home.
export function ProfileSwitchModal({
  visible,
  onClose,
}: Readonly<ProfileSwitchModalProps>) {
  const { activeProfileId, profiles, setActiveProfile } = useActiveProfile();
  const [isSaving, setIsSaving] = useState(false);

  async function selectProfile(profileId: string) {
    if (isSaving) return;

    setIsSaving(true);

    try {
      await setActiveProfile(profileId);
      onClose();
    } catch {
      Alert.alert(
        "Error",
        "Could not save the active profile. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
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
        style={[styles.profileOption, isActive && styles.activeOption]}
      >
        <View style={styles.profileText}>
          <Text style={styles.profileName}>{item.first_name}</Text>

          {isMain && <Text style={styles.mainLabel}>Main profile</Text>}
        </View>

        {isActive && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Switch active profile</Text>

          <Text style={styles.description}>Choose who is using AfterBell.</Text>

          <FlatList
            data={profiles}
            keyExtractor={(item) => item.id}
            renderItem={renderProfile}
            style={styles.list}
          />

          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={onClose}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
