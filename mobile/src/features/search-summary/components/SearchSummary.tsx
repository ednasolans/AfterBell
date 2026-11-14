import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";

import { useSearchSummary } from "../hooks/useSearchSummary";
import { type SearchSummaryFilters } from "../types";

type SearchSummaryProps = {
  filters: SearchSummaryFilters;
  // True when the results are loaded and there is at least one
  enabled: boolean;
};

function AiLabel() {
  return (
    <View style={styles.label}>
      <Ionicons name="sparkles-outline" size={14} color={colors.primaryDark} />
      <Text style={styles.labelText}>AI summary</Text>
    </View>
  );
}

// Short AI summary above the search results. The results never wait for it:
// while it loads there is a placeholder, and if there is no summary the block
// disappears without an error.
export function SearchSummary({ filters, enabled }: SearchSummaryProps) {
  const summary = useSearchSummary(filters, enabled);

  if (!enabled) {
    return null;
  }

  if (summary.isPending) {
    return (
      <View
        style={styles.card}
        accessible
        accessibilityLabel="Writing an AI summary of the results"
      >
        <AiLabel />
        <View style={styles.line} />
        <View style={[styles.line, styles.shortLine]} />
      </View>
    );
  }

  if (summary.data?.status !== "READY") {
    return null;
  }

  return (
    <View style={styles.card}>
      <AiLabel />
      <Text style={styles.text}>{summary.data.summary}</Text>
      <Text style={styles.note}>
        Written by AI from these results. Check the details of each activity.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 14,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
  },
  label: { flexDirection: "row", alignItems: "center", gap: 5 },
  labelText: { color: colors.primaryDark, fontSize: 12, fontWeight: "800" },
  text: { color: colors.text, lineHeight: 21 },
  note: { color: colors.textMuted, fontSize: 12, fontStyle: "italic" },
  line: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  shortLine: { width: "60%" },
});
