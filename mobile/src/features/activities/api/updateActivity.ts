import { type ActivityForm } from "../types";
import { saveActivity } from "./saveActivity";

export type UpdateActivityInput = { id: string; form: ActivityForm };

export async function updateActivity({
  id,
  form,
}: UpdateActivityInput): Promise<void> {
  await saveActivity(id, form);
}
