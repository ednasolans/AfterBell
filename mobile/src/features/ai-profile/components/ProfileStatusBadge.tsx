import { StyleSheet, Text } from "react-native";

import { PROFILE_STATUS_LABELS, type ProfileStatus } from "../types";

type ProfileStatusBadgeProps = { status: ProfileStatus };

export function ProfileStatusBadge({ status }: ProfileStatusBadgeProps) {
  const label = PROFILE_STATUS_LABELS[status];
  return (
    <Text
      style={[
        styles.badge,
        status === "approved" ? styles.published : styles.draft,
      ]}
      accessibilityLabel={`Status: ${label}`}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
    overflow: "hidden",
  },
  draft: { backgroundColor: "#fef3c7", color: "#92400e" },
  published: { backgroundColor: "#dcfce7", color: "#166534" },
});
