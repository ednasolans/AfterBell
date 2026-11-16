import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ErrorView } from "@/components/ErrorView";
import { LoadingView } from "@/components/LoadingView";
import { formatDate } from "@/lib/dates";
import { colors } from "@/theme/colors";

import { isActiveStatus } from "../enrolmentRules";
import { toEnrolmentErrorMessage } from "../enrolmentErrors";
import { useCancelEnrolmentRequest } from "../hooks/useCancelEnrolmentRequest";
import { useMyEnrolmentRequests } from "../hooks/useMyEnrolmentRequests";
import { type EnrolmentRequest } from "../types";
import { EnrolmentStatusBadge } from "./EnrolmentStatusBadge";

type MyEnrolmentRequestsListProps = {
  onExplore: () => void;
};

export function MyEnrolmentRequestsList({
  onExplore,
}: Readonly<MyEnrolmentRequestsListProps>) {
  const requests = useMyEnrolmentRequests();
  const cancel = useCancelEnrolmentRequest();
  const { refetch } = requests;

  // The provider may have answered while the family was on another screen.
  // The first focus is skipped: the query has just loaded.
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      void refetch();
    }, [refetch]),
  );

  function confirmCancel(request: EnrolmentRequest) {
    Alert.alert(
      "Cancel request",
      `Cancel the request of ${request.familyProfileName} for ${request.activityTitle}?`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: () => cancel.mutate(request.id),
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
        message="Your requests could not be loaded."
        onRetry={() => refetch()}
      />
    );
  }

  const cancelError = toEnrolmentErrorMessage(
    cancel.error,
    "The request could not be cancelled. Please try again.",
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.container}
      data={requests.data}
      keyExtractor={(request) => request.id}
      refreshing={requests.isRefetching}
      onRefresh={() => refetch()}
      ListHeaderComponent={
        cancelError ? (
          <Text style={styles.error}>{cancelError}</Text>
        ) : undefined
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.text}>You have not sent any requests yet.</Text>
          <Pressable accessibilityRole="button" onPress={onExplore}>
            <Text style={styles.link}>Explore activities</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.title}>{item.activityTitle}</Text>
            <EnrolmentStatusBadge status={item.status} />
          </View>
          {item.activityAvailable ? null : (
            <Text style={styles.unavailable}>No longer available</Text>
          )}
          <Text style={styles.text}>{`For ${item.familyProfileName}`}</Text>
          <Text style={styles.text}>
            {`Sent on ${formatDate(item.createdAt.slice(0, 10))}`}
          </Text>
          {item.message ? (
            <Text style={styles.message}>{item.message}</Text>
          ) : null}
          {isActiveStatus(item.status) ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cancel the request of ${item.familyProfileName} for ${item.activityTitle}`}
              accessibilityState={{ disabled: cancel.isPending }}
              disabled={cancel.isPending}
              onPress={() => confirmCancel(item)}
              hitSlop={8}
            >
              <Text style={styles.cancel}>Cancel request</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.background },
  container: { padding: 16, gap: 12 },
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
  text: { color: colors.textMuted },
  message: { color: colors.text, fontStyle: "italic" },
  unavailable: { color: colors.danger, fontWeight: "700" },
  cancel: { color: colors.danger, fontWeight: "700", marginTop: 4 },
  error: { color: colors.danger, textAlign: "center", marginBottom: 8 },
  empty: { alignItems: "center", gap: 8, marginTop: 24 },
  link: { color: colors.primaryDark, fontWeight: "700" },
});
