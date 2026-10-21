import { router } from "expo-router";

import { MyActivitiesList } from "@/features/activities/components/MyActivitiesList";

export default function MyActivitiesScreen() {
  return (
    <MyActivitiesList
      onCreate={() => router.push("/activities/new")}
      onEdit={(id) =>
        router.push({ pathname: "/activities/[id]/edit", params: { id } })
      }
    />
  );
}
