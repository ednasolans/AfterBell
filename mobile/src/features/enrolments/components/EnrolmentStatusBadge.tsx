import { Ionicons } from "@expo/vector-icons";
import { type ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

import { ENROLMENT_STATUS_LABELS, type EnrolmentStatus } from "../types";

type IconName = ComponentProps<typeof Ionicons>["name"];

// Each status has its own icon and text, so it does not rely on colour alone
const STATUS_ICONS: Record<EnrolmentStatus, IconName> = {
  pending: "time-outline",
  accepted: "checkmark-circle-outline",
  rejected: "close-circle-outline",
  cancelled: "remove-circle-outline",
};

const STATUS_COLORS: Record<EnrolmentStatus, string> = {
  pending: colors.text,
  accepted: colors.primaryDark,
  rejected: colors.danger,
  cancelled: colors.textMuted,
};

export function EnrolmentStatusBadge({
  status,
}: Readonly<{ status: EnrolmentStatus }>) {
  const color = STATUS_COLORS[status];
  return (
    <View style={styles.badge}>
      <Ionicons name={STATUS_ICONS[status]} size={16} color={color} />
      <Text style={[styles.text, { color }]}>
        {ENROLMENT_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 4 },
  text: { fontWeight: "700", fontSize: 13 },
});
