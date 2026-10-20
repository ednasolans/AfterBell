import { type ActivityCategory } from "@/lib/activityCategories";
import { type AgeRange } from "@/lib/ages";
import { type Tables } from "@/lib/database.types";
import { type PricePeriod } from "@/lib/price";
import { type TimeSlot } from "@/lib/schedule";

import { type Activity, type ActivityForm, type ActivityType } from "../types";

export type ActivityRow = Tables<"activities">;

// Converts a database row into an Activity (snake_case -> camelCase).
// The generated types only know that these columns are text; the CHECK
// constraints of the table guarantee that they hold one of our values.
export function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    providerId: row.provider_id,
    title: row.title,
    description: row.description,
    category: row.category as ActivityCategory,
    type: row.type as ActivityType,
    targetAgeRanges: row.target_age_ranges as AgeRange[],
    schedule: row.schedule as unknown as TimeSlot[],
    priceMin: row.price_min,
    priceMax: row.price_max,
    pricePeriod: row.price_period as PricePeriod,
    createdAt: row.created_at,
  };
}

// The values of a saved activity, to fill in the form when editing it
export function toActivityForm(activity: Activity): ActivityForm {
  return {
    title: activity.title,
    description: activity.description ?? "",
    category: activity.category,
    targetAgeRanges: activity.targetAgeRanges,
    schedule: activity.schedule,
    priceMin: activity.priceMin,
    priceMax: activity.priceMax,
    pricePeriod: activity.pricePeriod,
  };
}
