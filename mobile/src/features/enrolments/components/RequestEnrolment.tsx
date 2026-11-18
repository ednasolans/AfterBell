import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { type Activity } from "@/lib/activity";
import { colors } from "@/theme/colors";

import {
  activeRequestsFor,
  getAvailability,
  profilesThatCanAsk,
  UNAVAILABLE_MESSAGES,
} from "../enrolmentRules";
import { useEnrolmentProfiles } from "../hooks/useEnrolmentProfiles";
import { useMyEnrolmentRequests } from "../hooks/useMyEnrolmentRequests";
import { useSendEnrolmentRequests } from "../hooks/useSendEnrolmentRequests";
import { EnrolmentRequestForm } from "./EnrolmentRequestForm";
import { EnrolmentStatusBadge } from "./EnrolmentStatusBadge";

type RequestEnrolmentProps = {
  activity: Pick<Activity, "id" | "endDate" | "maxParticipants">;
  // Accepted requests, or null when they could not be read
  enrolledCount: number | null;
  onAddProfile: () => void;
  onOpenRequests: () => void;
};

function LinkButton({
  label,
  onPress,
}: Readonly<{ label: string; onPress: () => void }>) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

// The enrolment part of the activity detail: the family's requests for this
// activity, why it cannot be requested, or the button and form to ask
export function RequestEnrolment({
  activity,
  enrolledCount,
  onAddProfile,
  onOpenRequests,
}: Readonly<RequestEnrolmentProps>) {
  const requests = useMyEnrolmentRequests();
  const profiles = useEnrolmentProfiles();
  const send = useSendEnrolmentRequests();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [justSent, setJustSent] = useState(false);

  function renderAction() {
    if (requests.isPending || profiles.isPending) {
      return <ActivityIndicator color={colors.primary} />;
    }
    if (requests.isError || profiles.isError) {
      return (
        <View>
          <Text style={styles.text}>Your requests could not be loaded.</Text>
          <LinkButton
            label="Try again"
            onPress={() => {
              void requests.refetch();
              void profiles.refetch();
            }}
          />
        </View>
      );
    }

    const availability = getAvailability(activity, enrolledCount);
    if (availability !== "available") {
      return (
        <Text style={styles.text}>{UNAVAILABLE_MESSAGES[availability]}</Text>
      );
    }
    if (profiles.data.length === 0) {
      return (
        <View>
          <Text style={styles.text}>
            Add a family profile to ask for a place.
          </Text>
          <LinkButton label="Add a family profile" onPress={onAddProfile} />
        </View>
      );
    }

    const canAsk = profilesThatCanAsk(
      profiles.data,
      requests.data,
      activity.id,
    );
    if (canAsk.length === 0) {
      return (
        <Text style={styles.text}>
          Everyone in your family already has a request for this activity.
        </Text>
      );
    }
    if (!isFormOpen) {
      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setJustSent(false);
            setIsFormOpen(true);
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Request enrolment</Text>
        </Pressable>
      );
    }
    return (
      <EnrolmentRequestForm
        profiles={canAsk}
        onSubmit={(form) => send.mutateAsync({ activityId: activity.id, form })}
        isSending={send.isPending}
        sendError={send.error}
        onSent={() => {
          setIsFormOpen(false);
          setJustSent(true);
        }}
      />
    );
  }

  const active = requests.data
    ? activeRequestsFor(requests.data, activity.id)
    : [];

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Enrolment
      </Text>
      {justSent ? (
        <Text style={styles.confirmation}>
          Request sent. The provider will accept or reject it.
        </Text>
      ) : null}
      {active.length > 0 ? (
        <View style={styles.requests}>
          {active.map((request) => (
            <View key={request.id} style={styles.requestRow}>
              <Text style={styles.text}>{request.familyProfileName}</Text>
              <EnrolmentStatusBadge status={request.status} />
            </View>
          ))}
          <LinkButton label="See my requests" onPress={onOpenRequests} />
        </View>
      ) : null}
      {renderAction()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16, gap: 10 },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  text: { color: colors.textMuted, lineHeight: 21 },
  confirmation: { color: colors.primaryDark, fontWeight: "700" },
  requests: { gap: 6 },
  requestRow: { flexDirection: "row", justifyContent: "space-between" },
  link: { color: colors.primaryDark, fontWeight: "700", marginTop: 4 },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "600" },
});
