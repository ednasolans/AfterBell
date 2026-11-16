import { router } from "expo-router";

import { MyEnrolmentRequestsList } from "@/features/enrolments/components/MyEnrolmentRequestsList";

export default function MyRequestsScreen() {
  return <MyEnrolmentRequestsList onExplore={() => router.back()} />;
}
