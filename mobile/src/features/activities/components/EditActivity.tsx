import { ErrorView } from "@/components/ErrorView";
import { LoadingView } from "@/components/LoadingView";

import { toActivityForm } from "../api/toActivityForm";
import { useActivity } from "../hooks/useActivity";
import { useUpdateActivity } from "../hooks/useUpdateActivity";
import { ActivityForm } from "./ActivityForm";

type EditActivityProps = {
  id: string;
  onSaved?: () => void;
};

export function EditActivity({ id, onSaved }: EditActivityProps) {
  const activity = useActivity(id);
  const updateActivity = useUpdateActivity();

  if (activity.isPending) {
    return <LoadingView />;
  }

  if (activity.isError) {
    return (
      <ErrorView
        message="The activity could not be loaded."
        onRetry={() => activity.refetch()}
      />
    );
  }

  return (
    <ActivityForm
      initialForm={toActivityForm(activity.data)}
      submitLabel="Save changes"
      onSubmit={(form) => updateActivity.mutateAsync({ id, form })}
      isSaving={updateActivity.isPending}
      saveFailed={updateActivity.isError}
      onSaved={onSaved}
    />
  );
}
