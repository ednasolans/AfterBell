import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { LoadingView } from "@/components/LoadingView";
import { formatDate } from "@/lib/dates";
import { colors } from "@/theme/colors";

import {
  formatPlaces,
  formatProfileAge,
  isFullActivity,
} from "../enrolmentRules";
import { toEnrolmentErrorMessage } from "../enrolmentErrors";
import { useActivityPlaces } from "../hooks/useActivityPlaces";
import { useAnswerEnrolmentRequest } from "../hooks/useAnswerEnrolmentRequest";
import { useReceivedEnrolmentRequests } from "../hooks/useReceivedEnrolmentRequests";
import {
  ENROLMENT_STATUSES,
  ENROLMENT_STATUS_LABELS,
  type ActivityPlaces,
  type EnrolmentAnswer,
  type EnrolmentStatus,
  type ReceivedEnrolmentRequest,
  type ReceivedRequestFilters,
} from "../types";
import { EnrolmentStatusBadge } from "./EnrolmentStatusBadge";

type ReceivedRequestsListProps = {
  // Opens the screen filtered by one activity, e.g. from its card
  initialActivityId?: string | null;
};

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function Chip({ label, selected, onPress }: Readonly<ChipProps>) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

// The requests received by the provider, pending first, with filters by
// activity and status and the places of each activity
export function ReceivedRequestsList({
  initialActivityId = null,
}: Readonly<ReceivedRequestsListProps>) {
  const [filters, setFilters] = useState<ReceivedRequestFilters>({
    activityId: initialActivityId,
    status: null,
  });
  const requests = useReceivedEnrolmentRequests(filters);
  const places = useActivityPlaces();
  const answer = useAnswerEnrolmentRequest();

  const placesById = new Map(
    (places.data ?? []).map((item) => [item.activityId, item]),
  );

  // Families may have sent or cancelled requests while the provider was on
  // another screen. The first focus is skipped: the queries have just loaded.
  const { refetch: refetchRequests } = requests;
  const { refetch: refetchPlaces } = places;
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      void refetchRequests();
      void refetchPlaces();
    }, [refetchRequests, refetchPlaces]),
  );

  function confirmAnswer(
    request: ReceivedEnrolmentRequest,
    choice: EnrolmentAnswer,
  ) {
    const accepting = choice === "accept";
    Alert.alert(
      accepting ? "Accept request" : "Reject request",
      `${accepting ? "Accept" : "Reject"} the request of ${request.familyProfileName} for ${request.activityTitle}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: accepting ? "Accept" : "Reject",
          style: accepting ? "default" : "destructive",
          onPress: () =>
            answer.mutate({
              requestId: request.id,
              activityId: request.activityId,
              answer: choice,
            }),
        },
      ],
    );
  }

  if (requests.isPending) {
    return <LoadingView />;
  }
  if (requests.isError) {
    return (
      <ErrorView
        message="The requests could not be loaded."
        onRetry={() => {
          void requests.refetch();
          void places.refetch();
        }}
      />
    );
  }

  const answerError = toEnrolmentErrorMessage(
    answer.error,
    "The request could not be answered. Please try again.",
  );
  const selectedPlaces = filters.activityId
    ? placesById.get(filters.activityId)
    : undefined;
  const hasFilters = filters.activityId !== null || filters.status !== null;

  return (
    <FlatList
      testID="received-requests"
      style={styles.list}
      contentContainerStyle={styles.container}
      data={requests.data}
      keyExtractor={(request) => request.id}
      refreshing={requests.isRefetching}
      onRefresh={() => {
        void requests.refetch();
        void places.refetch();
      }}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.filterLabel}>Status</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip
              label="All"
              selected={filters.status === null}
              onPress={() => setFilters({ ...filters, status: null })}
            />
            {ENROLMENT_STATUSES.map((status: EnrolmentStatus) => (
              <Chip
                key={status}
                label={ENROLMENT_STATUS_LABELS[status]}
                selected={filters.status === status}
                onPress={() => setFilters({ ...filters, status })}
              />
            ))}
          </ScrollView>

          {places.data && places.data.length > 0 ? (
            <>
              <Text style={styles.filterLabel}>Activity</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                <Chip
                  label="All"
                  selected={filters.activityId === null}
                  onPress={() => setFilters({ ...filters, activityId: null })}
                />
                {places.data.map((item: ActivityPlaces) => (
                  <Chip
                    key={item.activityId}
                    label={item.activityTitle}
                    selected={filters.activityId === item.activityId}
                    onPress={() =>
                      setFilters({ ...filters, activityId: item.activityId })
                    }
                  />
                ))}
              </ScrollView>
            </>
          ) : null}

          {selectedPlaces ? (
            <Text style={styles.summary}>
              {`Places taken: ${formatPlaces(selectedPlaces)}${isFullActivity(selectedPlaces) ? " · Full" : ""}`}
            </Text>
          ) : null}
          {answerError ? <Text style={styles.error}>{answerError}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {hasFilters
            ? "No requests match these filters."
            : "You have not received any requests yet."}
        </Text>
      }
      renderItem={({ item }) => {
        const activityPlaces = placesById.get(item.activityId);
        const full = activityPlaces ? isFullActivity(activityPlaces) : false;
        const isAnswering =
          answer.isPending && answer.variables?.requestId === item.id;

        return (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.title}>
                {`${item.familyProfileName} · ${formatProfileAge(item)}`}
              </Text>
              <EnrolmentStatusBadge status={item.status} />
            </View>
            <Text style={styles.activity}>
              {activityPlaces
                ? `${item.activityTitle} · ${formatPlaces(activityPlaces)}`
                : item.activityTitle}
            </Text>
            <Text style={styles.text}>{item.customerEmail}</Text>
            <Text style={styles.text}>
              {`Received on ${formatDate(item.createdAt.slice(0, 10))}`}
            </Text>
            {item.message ? (
              <Text style={styles.message}>{item.message}</Text>
            ) : null}

            {item.status === "pending" ? (
              <>
                {full ? (
                  <Text style={styles.full}>
                    This activity is full: you cannot accept more requests.
                  </Text>
                ) : null}
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Accept the request of ${item.familyProfileName} for ${item.activityTitle}`}
                    accessibilityState={{ disabled: full || answer.isPending }}
                    disabled={full || answer.isPending}
                    onPress={() => confirmAnswer(item, "accept")}
                    style={[
                      styles.button,
                      styles.accept,
                      (full || isAnswering) && styles.disabled,
                    ]}
                  >
                    <Text style={styles.acceptText}>Accept</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Reject the request of ${item.familyProfileName} for ${item.activityTitle}`}
                    accessibilityState={{ disabled: answer.isPending }}
                    disabled={answer.isPending}
                    onPress={() => confirmAnswer(item, "reject")}
                    style={[
                      styles.button,
                      styles.reject,
                      isAnswering && styles.disabled,
                    ]}
                  >
                    <Text style={styles.rejectText}>Reject</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.background },
  container: { padding: 16, gap: 12 },
  header: { gap: 8 },
  filterLabel: { color: colors.textMuted, fontWeight: "700", fontSize: 12 },
  chips: { gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: { color: colors.text, fontWeight: "600" },
  chipTextSelected: { color: colors.primaryDark, fontWeight: "800" },
  summary: { color: colors.text, fontWeight: "800", marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.text },
  activity: { color: colors.primaryDark, fontWeight: "700" },
  text: { color: colors.textMuted },
  message: { color: colors.text, fontStyle: "italic" },
  full: { color: colors.danger, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginTop: 6 },
  button: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
  },
  accept: { backgroundColor: colors.primary },
  acceptText: { color: colors.white, fontWeight: "800" },
  reject: { borderWidth: 1, borderColor: colors.danger },
  rejectText: { color: colors.danger, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  error: { color: colors.danger, textAlign: "center" },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 24 },
});
