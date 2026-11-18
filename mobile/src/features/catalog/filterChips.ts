import { categoryLabel } from "@/lib/activityCategories";
import {
  formatAmount,
  formatPrice,
  PRICE_PERIOD_LABELS,
  type PricePeriod,
} from "@/lib/price";
import { type SearchFilters } from "@/lib/searchFilters";

// One active filter shown above the results. `remove` returns the filters
// without it.
export type FilterChip = {
  key: string;
  label: string;
  remove: (filters: SearchFilters) => SearchFilters;
};

function ageLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) {
    return min === max ? `Age ${min}` : `Ages ${min}–${max}`;
  }
  return min === null ? `Up to ${max} years` : `From ${min} years`;
}

function priceLabel(
  min: number | null,
  max: number | null,
  period: PricePeriod,
): string {
  if (min !== null && max !== null) {
    return `${formatAmount(min)}–${formatPrice(max, period)}`;
  }
  if (min !== null) {
    return `From ${formatPrice(min, period)}`;
  }
  if (max !== null) {
    return `Up to ${formatPrice(max, period)}`;
  }
  return `Priced ${PRICE_PERIOD_LABELS[period].toLowerCase()}`;
}

// The active filters, in the order of the panel: one chip per category, then
// age, city and price
export function activeFilterChips(filters: SearchFilters): FilterChip[] {
  const chips: FilterChip[] = filters.categories.map((name) => ({
    key: `category-${name}`,
    label: categoryLabel(name),
    remove: (current) => ({
      ...current,
      categories: current.categories.filter((category) => category !== name),
    }),
  }));
  if (filters.ageMin !== null || filters.ageMax !== null) {
    chips.push({
      key: "age",
      label: ageLabel(filters.ageMin, filters.ageMax),
      remove: (current) => ({ ...current, ageMin: null, ageMax: null }),
    });
  }
  if (filters.city !== null) {
    chips.push({
      key: "city",
      label: filters.city,
      remove: (current) => ({ ...current, city: null }),
    });
  }
  // Prices always come with a period (validateSearchFilters)
  if (filters.pricePeriod !== null) {
    chips.push({
      key: "price",
      label: priceLabel(
        filters.priceMin,
        filters.priceMax,
        filters.pricePeriod,
      ),
      remove: (current) => ({
        ...current,
        priceMin: null,
        priceMax: null,
        pricePeriod: null,
      }),
    });
  }
  return chips;
}
