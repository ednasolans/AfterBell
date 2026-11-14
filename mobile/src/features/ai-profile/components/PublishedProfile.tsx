import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import LoadingButton from "@/components/LoadingButton";

import { type ProviderProfile } from "../types";
import { ProfileStatusBadge } from "./ProfileStatusBadge";
import { colors } from "@/theme/colors";

type PublishedProfileProps = {
  profile: ProviderProfile;
  onEdit: () => void;
};

export function PublishedProfile({ profile, onEdit }: PublishedProfileProps) {
  return (
    <View style={styles.card}>
      <View style={styles.statusRow}>
        <View style={styles.icon}>
          <Ionicons
            name="checkmark-circle-outline"
            size={25}
            color={colors.primaryDark}
          />
        </View>
        <ProfileStatusBadge status="approved" />
      </View>
      <Text style={styles.headline}>{profile.headline}</Text>
      <Text style={styles.description}>{profile.description}</Text>
      <Text style={styles.hint}>
        Families can see this profile. If you edit it or generate it again, they
        keep seeing this text until you approve the new one.
      </Text>
      <LoadingButton label="Edit text" onPress={onEdit} variant="outline" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginTop: 10,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  headline: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.textMuted,
    marginBottom: 16,
  },
  hint: { color: colors.textMuted, lineHeight: 20, marginBottom: 14 },
});
