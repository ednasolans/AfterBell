import { router } from "expo-router";

import { MyActivitiesList } from "@/features/activities/components/MyActivitiesList";
import { ActivityPlacesCounter } from "@/features/enrolments/components/ActivityPlacesCounter";

export default function MyActivitiesScreen() {
  return (
    <MyActivitiesList
      onCreate={() => router.push("/activities/new")}
      onEdit={(id) =>
        router.push({ pathname: "/activities/[id]/edit", params: { id } })
      }
      renderCardFooter={(activity) => (
        <ActivityPlacesCounter
          activityId={activity.id}
          onPress={() =>
            router.push({
              pathname: "/requests",
              params: { activityId: activity.id },
            })
          }
        />
      )}
    />
  );
}
