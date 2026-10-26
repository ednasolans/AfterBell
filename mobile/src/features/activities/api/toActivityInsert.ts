import { type TablesInsert } from "@/lib/database.types";
import { emptyToNull } from "@/lib/text";

import { type ActivityForm } from "../types";

export type ActivityInsert = TablesInsert<"activities">;

// Converts a validated form into a database row (camelCase -> snake_case).
// account_id is not sent: the database fills it with the logged-in user.
export function toActivityInsert(form: ActivityForm): ActivityInsert {
  const { minAge, maxAge, price, addressId } = form;
  if (
    minAge === null ||
    maxAge === null ||
    price === null ||
    addressId === null
  ) {
    throw new Error("The activity must be validated before saving it");
  }

  return {
    title: form.title.trim(),
    description: emptyToNull(form.description),
    min_age: minAge,
    max_age: maxAge,
    // One time slot per line: empty lines are dropped
    schedule: form.schedule.map((slot) => slot.trim()).filter(Boolean),
    price,
    // Dates are optional: an empty field is saved as null
    start_date: emptyToNull(form.startDate),
    end_date: emptyToNull(form.endDate),
    address_id: addressId,
    status: form.status,
  };
}