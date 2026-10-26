import { type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";

import { type Activity } from "@/features/activities/types";

import { type CatalogActivity, type CatalogProvider } from "./types";

// Shared by the tests of the catalog

export function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "a1",
    accountId: "p1",
    providerProfileId: "pp1",
    addressId: "ad1",
    title: "Saturday workshop",
    description: "Fun for everyone",
    minAge: 7,
    maxAge: 12,
    schedule: ["Monday 17:00-18:00"],
    price: 15,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    status: "published",
    createdAt: "2026-10-01T10:00:00Z",
    updatedAt: "2026-10-01T10:00:00Z",
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