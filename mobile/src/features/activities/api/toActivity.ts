import { type ActivityCategory } from "@/lib/activityCategories";
import { type AgeRange } from "@/lib/ages";
import { type Tables } from "@/lib/database.types";
import { type PricePeriod } from "@/lib/price";
import { type TimeSlot } from "@/lib/schedule";
import { type Activity, type ActivityForm, type ActivityStatus } from "../types";

export type ActivityRow = Tables<"activities">;

// Converts a database row into an Activity (snake_case -> camelCase).
// The generated types only know that these columns are text; the CHECK
// constraints of the table guarantee that they hold one of our values.
export function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    accountId: row.account_id,
    providerProfileId: row.provider_profile_id,
    addressId: row.address_id,
    title: row.title,
    description: row.description,
    minAge: row.min_age,
    maxAge: row.max_age,
    schedule: row.schedule,
    price: row.price,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as ActivityStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// The values of a saved activity, to fill in the form when editing it
export function toActivityForm(activity: Activity): ActivityForm {
  return {
    title: activity.title,
    description: activity.description ?? "",
    minAge: activity.minAge,
    maxAge: activity.maxAge,
    schedule: activity.schedule,
    price: activity.price,
    startDate: activity.startDate ?? "",
    endDate: activity.endDate ?? "",
    addressId: activity.addressId,
    status: activity.status,
  };
}
