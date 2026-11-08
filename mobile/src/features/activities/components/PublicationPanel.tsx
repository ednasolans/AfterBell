import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import LoadingButton from "@/components/LoadingButton";
import { type Activity } from "@/lib/activity";
import { ACTIVITY_STATUS_LABELS } from "@/lib/activityStatus";
import { colors } from "@/theme/colors";

import { useChangeActivityStatus } from "../hooks/useChangeActivityStatus";
import { usePublicationIssues } from "../hooks/usePublicationIssues";
import { PUBLICATION_ISSUE_LABELS } from "../types";

type PublicationPanelProps = {
  activity: Activity;
};

// Shows whether customers can see the activity and lets the provider publish
// or unpublish it. Before publishing, it lists everything that is missing.
export function PublicationPanel({ activity }: PublicationPanelProps) {
  const changeStatus = useChangeActivityStatus();
  const isPublished = activity.status === "published";

  function confirmPublish() {
    Alert.alert(
      "Publish activity",
      `Customers will be able to see "${activity.title}" and send enrolment requests.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Publish",
          onPress: () =>
            changeStatus.mutate({ id: activity.id, status: "published" }),
        },
      ],
    );
  }

  function confirmUnpublish() {
    Alert.alert(
      "Unpublish activity",
      `Customers will no longer see "${activity.title}". Its data is kept and you can publish it again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unpublish",
          style: "destructive",
          onPress: () =>
            changeStatus.mutate({ id: activity.id, status: "draft" }),
        },
      ],
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Publication
        </Text>
        <View style={[styles.status, isPublished && styles.statusPublished]}>
          <Text
            style={[
              styles.statusText,
              isPublished && styles.statusTextPublished,
            ]}
          >
            {ACTIVITY_STATUS_LABELS[activity.status]}
          </Text>
        </View>
      </View>

      {isPublished ? (
        <>
          <Text style={styles.text}>Customers can see this activity.</Text>
          <LoadingButton
            label="Unpublish"
            variant="outline"
            onPress={confirmUnpublish}
            loading={changeStatus.isPending}
          />
        </>
      ) : (
        <DraftContent
          activityId={activity.id}
          onPublish={confirmPublish}
          isPublishing={changeStatus.isPending}
        />
      )}

      {changeStatus.isSuccess ? (
        <Text style={styles.success}>
          {changeStatus.variables.status === "published"
            ? "Your activity is now published."
            : "Your activity is no longer visible to customers."}
        </Text>
      ) : null}
      {changeStatus.isError ? (
        <Text style={styles.error}>
          {`The status could not be changed: ${changeStatus.error.message}`}
        </Text>
      ) : null}
    </View>
  );
}

type DraftContentProps = {
  activityId: string;
  onPublish: () => void;
  isPublishing: boolean;
};

// A draft can be published only when nothing is missing
function DraftContent({
  activityId,
  onPublish,
  isPublishing,
}: DraftContentProps) {
  const issues = usePublicationIssues(activityId);

  if (issues.isPending) {
    return <Text style={styles.text}>Checking what is missing…</Text>;
  }

  if (issues.isError) {
    return (
      <View style={styles.row}>
        <Text style={styles.error}>
          We could not check if it can be published.
        </Text>
        <Pressable
          onPress={() => issues.refetch()}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={styles.link}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (issues.data.length > 0) {
    return (
      <View style={styles.issues}>
        <Text style={styles.text}>
          Customers cannot see this activity yet. Before publishing:
        </Text>
        {issues.data.map((issue) => (
          <Text key={issue} style={styles.issue}>
            {`• ${PUBLICATION_ISSUE_LABELS[issue]}`}
          </Text>
        ))}
        <Text style={styles.hint}>
          Save your changes and this list will update.
        </Text>
      </View>
    );
  }

  return (
    <>
      <Text style={styles.text}>
        Customers cannot see this activity yet. It is ready to publish.
      </Text>
      <LoadingButton
        label="Publish"
        onPress={onPublish}
        loading={isPublishing}
      />
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 10,
    padding: 15,
    marginBottom: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: colors.text, fontSize: 17, fontWeight: "800" },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: colors.surfaceMuted,
  },
  statusPublished: { backgroundColor: colors.primarySoft },
  statusText: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  statusTextPublished: { color: colors.primaryDark },
  text: { color: colors.textMuted, lineHeight: 20 },
  issues: { gap: 6 },
  issue: { color: colors.text, lineHeight: 20 },
  hint: { color: colors.textMuted, fontSize: 12, fontStyle: "italic" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  link: { color: colors.primaryDark, fontWeight: "700" },
  success: { color: colors.primaryDark, fontWeight: "700" },
  error: { color: colors.danger },
});
