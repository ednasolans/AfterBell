import { StyleSheet, Text, View } from "react-native";

import { type ProviderProfile } from "../types";
import { ProfileStatusBadge } from "./ProfileStatusBadge";

type PublishedProfileProps = { profile: ProviderProfile };

export function PublishedProfile({ profile }: PublishedProfileProps) {
  return (
    <View>
      <ProfileStatusBadge status="approved" />
      <Text style={styles.headline}>{profile.headline}</Text>
      <Text style={styles.description}>{profile.description}</Text>
      <Text style={styles.hint}>
        Families can now see your profile. Editing a published profile will be
        available soon.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  description: { fontSize: 16, lineHeight: 22, marginBottom: 16 },
  hint: { color: "#555" },
});
