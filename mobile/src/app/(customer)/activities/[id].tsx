import { router, useLocalSearchParams } from "expo-router";

import { CatalogActivityDetail } from "@/features/catalog/components/CatalogActivityDetail";
import { RequestEnrolment } from "@/features/enrolments/components/RequestEnrolment";

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <CatalogActivityDetail
      id={id}
      renderFooter={({ activity, enrolledCount }) => (
        <RequestEnrolment
          activity={activity}
          enrolledCount={enrolledCount}
          onAddProfile={() => router.push("/family-profile-form")}
          onOpenRequests={() => router.push("/my-requests")}
        />
      )}
    />
  );
}
