import { type ActivityForm } from "../types";
import { saveActivity } from "./saveActivity";

export async function createActivity(form: ActivityForm): Promise<void> {
  await saveActivity(null, form);
}
