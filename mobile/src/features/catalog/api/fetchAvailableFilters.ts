import { type PricePeriod } from "@/lib/price";
import { supabase } from "@/lib/supabase";

// Lowest and highest price of the published activities of one period
export type PriceRange = { period: PricePeriod; min: number; max: number };

// The values to build the filter panel (available_activity_filters)
export type AvailableFilters = {
  // Names of the category catalogue
  categories: string[];
  // Cities of published activities, sorted
  cities: string[];
  // One range per period that has published activities, hour to year
  prices: PriceRange[];
};

export async function fetchAvailableFilters(): Promise<AvailableFilters> {
  const { data, error } = await supabase.rpc("available_activity_filters");
  if (error) {
    throw new Error(error.message);
  }
  // The function always returns this shape, and price_period has a CHECK constraint
  return data as unknown as AvailableFilters;
}
