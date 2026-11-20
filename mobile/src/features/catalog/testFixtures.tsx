import { type ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";

import { type Activity } from "@/lib/activity";

import { FavouritesProfileProvider } from "./favouritesProfile";
import {
  type CatalogActivity,
  type CatalogProvider,
  type FavouriteActivity,
} from "./types";

// Shared by the tests of the catalog

export function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    isTutor: false,
    languages: [],
    id: "a1",
    providerId: "p1",
    addressId: "ad1",
    title: "Saturday workshop",
    description: "Fun for everyone",
    category: "football",
    type: "whole_year",
    startDate: null,
    endDate: null,
    targetAgeRanges: ["7-9", "10-12"],
    schedule: [{ day: "monday", startTime: "17:00", endTime: "18:00" }],
    price: 15,
    pricePeriod: "per_month",
    maxParticipants: 20,
    status: "published",
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
    isFavourite: false,
    ...overrides,
  };
}

export function makeFavourite(
  overrides: Partial<FavouriteActivity> = {},
): FavouriteActivity {
  return {
    activity: makeActivity(),
    providerName: "Sports Club",
    available: true,
    savedAt: "2026-11-01T10:00:00Z",
    ...overrides,
  };
}

// The active family profile of the tests: favourites belong to it
export const TEST_PROFILE_ID = "family-profile-1";

// Renders a component that uses React Query, with a fresh client that does not
// retry, and an active family profile (null for a family without profiles)
export async function renderWithQuery(
  ui: ReactElement,
  profileId: string | null = TEST_PROFILE_ID,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <FavouritesProfileProvider profileId={profileId}>
        {ui}
      </FavouritesProfileProvider>
    </QueryClientProvider>,
  );
}
