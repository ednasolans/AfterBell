import { router, useLocalSearchParams } from "expo-router";

import { EditActivity } from "@/features/activities/components/EditActivity";

export default function EditActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <EditActivity id={id} onSaved={() => router.back()} />;
}
