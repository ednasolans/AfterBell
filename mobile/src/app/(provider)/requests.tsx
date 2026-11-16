import { Stack, useLocalSearchParams } from "expo-router";

import { ReceivedRequestsList } from "@/features/enrolments/components/ReceivedRequestsList";

export default function EnrolmentRequestsScreen() {
  // Set when it is opened from the card of one activity
  const { activityId } = useLocalSearchParams<{ activityId?: string }>();

  return (
    <>
      <Stack.Screen options={{ title: "Enrolment requests" }} />
      <ReceivedRequestsList initialActivityId={activityId ?? null} />
    </>
  );
}
