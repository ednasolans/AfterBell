import { type TablesInsert } from "@/lib/database.types";
import { emptyToNull } from "@/lib/text";

import { type ActivityForm } from "../types";

export type ActivityInsert = TablesInsert<"activities">;

// Converts a validated form into a database row (camelCase -> snake_case).
// provider_id and type are not sent: the database fills them
// with the logged-in user and 'whole_year'.
export function toActivityInsert(form: ActivityForm): ActivityInsert {
  const { category, priceMin, priceMax, pricePeriod } = form;
  if (
    category === null ||
    priceMin === null ||
    priceMax === null ||
    pricePeriod === null
  ) {
    throw new Error("The activity must be validated before saving it");
  }

  return {
    title: form.title.trim(),
    description: emptyToNull(form.description),
    category,
    target_age_ranges: form.targetAgeRanges,
    // Plain objects: an interface is not assignable to the generic Json type
    schedule: form.schedule.map(({ day, startTime, endTime }) => ({
      day,
      startTime,
      endTime,
    })),
    price_min: priceMin,
    price_max: priceMax,
    price_period: pricePeriod,
  };
}
