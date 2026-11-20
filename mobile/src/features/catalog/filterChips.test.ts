import { NO_SEARCH_FILTERS, type SearchFilters } from "@/lib/searchFilters";

import { activeFilterChips } from "./filterChips";

const ALL: SearchFilters = {
  categories: ["music", "swimming"],
  ageMin: 6,
  ageMax: 9,
  city: "Lleida",
  postalCode: null,
  priceMin: 10,
  priceMax: 40.5,
  pricePeriod: "per_month",
};

function labels(filters: SearchFilters): string[] {
  return activeFilterChips(filters).map((chip) => chip.label);
}

function chip(filters: SearchFilters, key: string) {
  const found = activeFilterChips(filters).find((item) => item.key === key);
  if (!found) {
    throw new Error(`No chip ${key}`);
  }
  return found;
}

describe("activeFilterChips", () => {
  it("has no chips without filters", () => {
    expect(activeFilterChips(NO_SEARCH_FILTERS)).toEqual([]);
  });

  it("has one chip per category, then age, city and price", () => {
    expect(labels(ALL)).toEqual([
      "Music",
      "Swimming",
      "Ages 6–9",
      "Lleida",
      "10–40,50 € per month",
    ]);
  });

  it.each([
    [{ ageMin: 6, ageMax: null }, "From 6 years"],
    [{ ageMin: null, ageMax: 9 }, "Up to 9 years"],
    [{ ageMin: 7, ageMax: 7 }, "Age 7"],
    [{ ageMin: 0, ageMax: 0 }, "Age 0"],
  ])("labels the ages %j as %s", (ages, label) => {
    expect(chip({ ...NO_SEARCH_FILTERS, ...ages }, "age").label).toBe(label);
  });

  it.each([
    [{ priceMin: 10, priceMax: null }, "From 10 € per hour"],
    [{ priceMin: null, priceMax: 20 }, "Up to 20 € per hour"],
    [{ priceMin: null, priceMax: null }, "Priced per hour"],
  ])("labels the price %j as %s", (prices, label) => {
    const filters = {
      ...NO_SEARCH_FILTERS,
      ...prices,
      pricePeriod: "per_hour" as const,
    };
    expect(chip(filters, "price").label).toBe(label);
  });

  it("removes only the category of its chip", () => {
    expect(chip(ALL, "category-music").remove(ALL)).toEqual({
      ...ALL,
      categories: ["swimming"],
    });
  });

  it("removes both ages, the city, or the whole price", () => {
    expect(chip(ALL, "age").remove(ALL)).toEqual({
      ...ALL,
      ageMin: null,
      ageMax: null,
    });
    expect(chip(ALL, "city").remove(ALL)).toEqual({ ...ALL, city: null });
    expect(chip(ALL, "price").remove(ALL)).toEqual({
      ...ALL,
      priceMin: null,
      priceMax: null,
      pricePeriod: null,
    });
  });

  it("does not change the filters", () => {
    const filters = { ...ALL, categories: [...ALL.categories] };
    for (const item of activeFilterChips(filters)) {
      item.remove(filters);
    }
    expect(filters).toEqual(ALL);
  });
});
