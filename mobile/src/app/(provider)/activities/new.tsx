import { router } from "expo-router";

import { ActivityForm } from "@/features/activities/components/ActivityForm";
import { useCreateActivity } from "@/features/activities/hooks/useCreateActivity";

export default function NewActivityScreen() {
  const createActivity = useCreateActivity();

  return (
    <ActivityForm
      submitLabel="Create activity"
      onSubmit={createActivity.mutateAsync}
      isSaving={createActivity.isPending}
      saveError={createActivity.error}
      onSaved={() => router.back()}
    />
  );
}
