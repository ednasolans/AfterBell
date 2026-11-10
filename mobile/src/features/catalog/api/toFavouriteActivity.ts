import { type Activity } from "@/lib/activity";
import { type AgeRange } from "@/lib/ages";
import { type Database } from "@/lib/database.types";
import { type PricePeriod } from "@/lib/price";

import { type FavouriteActivity } from "../types";

export type FavouriteRow =
  Database["public"]["Functions"]["my_favourites"]["Returns"][number];

// The generated types say every column of a function is set, but the dates
// and the provider name can be null
export function toFavouriteActivity(row: FavouriteRow): FavouriteActivity {
  return {
    activity: {
      id: row.activity_id,
      title: row.title,
      category: row.category,
      type: row.type as Activity["type"],
      startDate: (row.start_date as string | null) ?? null,
      endDate: (row.end_date as string | null) ?? null,
      targetAgeRanges: row.target_age_ranges as AgeRange[],
      price: row.price,
      pricePeriod: row.price_period as PricePeriod,
    },
    providerName: (row.provider_name as string | null) ?? null,
    available: row.available,
    savedAt: row.created_at,
  };
}
