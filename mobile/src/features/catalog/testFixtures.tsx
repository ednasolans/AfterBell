import { type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";

import { type Activity } from "@/features/activities/types";
import {
  ACTIVITY_CATEGORY_LABELS,
  type ActivityCategory,
} from "@/lib/activityCategories";
import { PRICE_PERIOD_LABELS, type PricePeriod } from "@/lib/price";

import { type CatalogActivity, type CatalogProvider } from "./types";

// Shared by the tests of the catalog

export function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "a1",
    providerId: "p1",
    title: "Saturday workshop",
    description: "Fun for everyone",
    // Any valid category: the tests do not depend on which one
    category: Object.keys(ACTIVITY_CATEGORY_LABELS)[0] as ActivityCategory,
    type: "whole_year",
    targetAgeRanges: ["7-9"],
    schedule: [],
    priceMin: 10,
    priceMax: 20,
    // Any valid period: formatPriceRange looks its label up
    pricePeriod: Object.keys(PRICE_PERIOD_LABELS)[0] as PricePeriod,
    maxParticipants: 12,
    addressId: "ad1",
    createdAt: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

export function makeProvider(
  overrides: Partial<CatalogProvider> = {},
): CatalogProvider {
  return {
    id: "p1",
    headline: "Football for all ages",
    description: "A friendly club with twenty years of experience",
    contact: {
      name: "Sports Club",
      email: "club@example.com",
      phoneNumber: "600000000",
      website: "https://club.example.com",
    },
    ...overrides,
  };
}

export function makeCatalogActivity(
  overrides: Partial<CatalogActivity> = {},
): CatalogActivity {
  return {
    activity: makeActivity(),
    provider: makeProvider(),
    ...overrides,
  };
}

// Renders a component that uses React Query, with a fresh client that does not retry
export async function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}