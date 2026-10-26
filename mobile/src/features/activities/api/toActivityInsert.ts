import { type TablesInsert, type TablesUpdate } from "@/lib/database.types";
import { emptyToNull } from "@/lib/text";

import { type ActivityForm } from "../types";

export type ActivityInsert = TablesInsert<"activities">;
export type ActivityUpdate = TablesUpdate<"activities">;

// Converts a validated form into a database row (camelCase -> snake_case).
// provider_id is not sent: the database fills it with the logged-in user.
export function toActivityInsert(form: ActivityForm): ActivityInsert {
  const { price, pricePeriod, addressId, category, maxParticipants } = form;
  if (
    price === null ||
    pricePeriod === null ||
    addressId === null ||
    category === null ||
    maxParticipants === null
  ) {
    throw new Error("The activity must be validated before saving it");
  }

  return {
    title: form.title.trim(),
    description: emptyToNull(form.description),
    category,
    type: form.type,
    target_age_ranges: form.targetAgeRanges,
    schedule: form.schedule.map(({ day, startTime, endTime }) => ({
      day,
      startTime,
      endTime,
    })),
    price,
    price_period: pricePeriod,
    max_participants: maxParticipants,
    address_id: addressId,
  };
}

// The same row without `type`. The type cannot be changed after creation, so
// owners have no UPDATE privilege on that column: sending it, even with the
// same value, makes the whole update fail with "permission denied".
export function toActivityUpdate(form: ActivityForm): ActivityUpdate {
  const row = toActivityInsert(form);
  delete row.type;
  return row;
}
