import { formatAddress } from "@/lib/addresses";
import { type Tables } from "@/lib/database.types";

import { APPROVED_PROFILE_STATUS } from "./fetchApprovedProfiles";
import { fetchCatalogActivities } from "./fetchCatalogActivities";
import { fetchCatalogActivity } from "./fetchCatalogActivity";

type QueryResult = { data: unknown; error: { message: string } | null };
type Call = [string, unknown[]];

const mockFrom = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

// A query builder that resolves to `result` however it is chained,
// and remembers the calls it received
function query(result: QueryResult) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order", "maybeSingle"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return { builder, calls };
}

function mockTables(tables: Record<string, QueryResult>) {
  const queries = Object.fromEntries(
    Object.entries(tables).map(([table, result]) => [table, query(result)]),
  );
  mockFrom.mockImplementation((table: string) => queries[table].builder);
  return queries;
}

const activityRow = {
  id: "a1",
  provider_id: "p1",
  title: "Football",
  description: "Fun for everyone",
  category: "sports",
  type: "whole_year",
  target_age_ranges: ["7-9"],
  schedule: [],
  price_min: 10,
  price_max: 20,
  price_period: "month",
  max_participants: 12,
  address_id: "ad1",
  created_at: "2026-10-01T10:00:00Z",
};

const profileRow = {
  provider_id: "p1",
  headline: "Football for all ages",
  description: "A friendly club",
};

const sheetRow = {
  provider_id: "p1",
  name: "Sports Club",
  email: "club@example.com",
  phone_number: "600000000",
  website: "https://club.example.com",
};

const addressRow: Tables<"addresses"> = {
  id: "ad1",
  provider_id: "p1",
  address: "Main Street 1",
  city: "Lleida",
  created_at: "2026-10-01T10:00:00Z",
};

const contact = {
  name: "Sports Club",
  email: "club@example.com",
  phoneNumber: "600000000",
  website: "https://club.example.com",
};

const provider = {
  id: "p1",
  headline: "Football for all ages",
  description: "A friendly club",
  contact,
};

describe("fetchCatalogActivities", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("returns the activities of providers with an approved profile", async () => {
    const queries = mockTables({
      provider_profiles: { data: [profileRow], error: null },
      activities: { data: [activityRow], error: null },
      technical_sheets: { data: [sheetRow], error: null },
    });

    const result = await fetchCatalogActivities();

    expect(result).toHaveLength(1);
    expect(result[0].activity).toMatchObject({
      id: "a1",
      providerId: "p1",
      title: "Football",
    });
    expect(result[0].provider).toEqual(provider);
    expect(queries.provider_profiles.calls).toContainEqual([
      "eq",
      ["status", APPROVED_PROFILE_STATUS],
    ]);
    expect(queries.activities.calls).toContainEqual([
      "in",
      ["provider_id", ["p1"]],
    ]);
  });

  it("leaves the contact details empty when the provider has no technical sheet", async () => {
    mockTables({
      provider_profiles: { data: [profileRow], error: null },
      activities: { data: [activityRow], error: null },
      technical_sheets: { data: [], error: null },
    });

    const result = await fetchCatalogActivities();

    expect(result[0].provider.contact).toBeNull();
    expect(result[0].provider.headline).toBe("Football for all ages");
  });

  it("returns nothing, without reading activities, when no profile is approved", async () => {
    mockTables({ provider_profiles: { data: [], error: null } });

    const result = await fetchCatalogActivities();

    expect(result).toEqual([]);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("never returns an activity whose provider has no approved profile", async () => {
    mockTables({
      provider_profiles: { data: [profileRow], error: null },
      activities: {
        data: [activityRow, { ...activityRow, id: "a2", provider_id: "p2" }],
        error: null,
      },
      technical_sheets: { data: [sheetRow], error: null },
    });

    const result = await fetchCatalogActivities();

    expect(result.map((item) => item.activity.id)).toEqual(["a1"]);
  });

  it("fails when the profiles cannot be read", async () => {
    mockTables({
      provider_profiles: { data: null, error: { message: "no profiles" } },
    });

    await expect(fetchCatalogActivities()).rejects.toThrow("no profiles");
  });

  it("fails when the activities cannot be read", async () => {
    mockTables({
      provider_profiles: { data: [profileRow], error: null },
      activities: { data: null, error: { message: "boom" } },
    });

    await expect(fetchCatalogActivities()).rejects.toThrow("boom");
  });

  it("fails when the contact details cannot be read", async () => {
    mockTables({
      provider_profiles: { data: [profileRow], error: null },
      activities: { data: [activityRow], error: null },
      technical_sheets: { data: null, error: { message: "no sheets" } },
    });

    await expect(fetchCatalogActivities()).rejects.toThrow("no sheets");
  });
});

describe("fetchCatalogActivity", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("returns the activity with its profile, contact details and address", async () => {
    const queries = mockTables({
      activities: { data: activityRow, error: null },
      provider_profiles: { data: [profileRow], error: null },
      technical_sheets: { data: [sheetRow], error: null },
      addresses: { data: addressRow, error: null },
    });

    const result = await fetchCatalogActivity("a1");

    expect(result?.activity.id).toBe("a1");
    expect(result?.provider).toEqual(provider);
    expect(result?.address).toBe(formatAddress(addressRow));
    expect(queries.provider_profiles.calls).toContainEqual([
      "eq",
      ["status", APPROVED_PROFILE_STATUS],
    ]);
  });

  it("returns null when the activity does not exist", async () => {
    mockTables({ activities: { data: null, error: null } });

    expect(await fetchCatalogActivity("missing")).toBeNull();
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("returns null when the provider has no approved profile", async () => {
    mockTables({
      activities: { data: activityRow, error: null },
      provider_profiles: { data: [], error: null },
      technical_sheets: { data: [sheetRow], error: null },
      addresses: { data: addressRow, error: null },
    });

    expect(await fetchCatalogActivity("a1")).toBeNull();
  });

  it("leaves the contact details and the address empty when they cannot be found", async () => {
    mockTables({
      activities: { data: activityRow, error: null },
      provider_profiles: { data: [profileRow], error: null },
      technical_sheets: { data: [], error: null },
      addresses: { data: null, error: null },
    });

    const result = await fetchCatalogActivity("a1");

    expect(result?.provider.contact).toBeNull();
    expect(result?.address).toBeNull();
  });

  it("fails when the activity cannot be read", async () => {
    mockTables({ activities: { data: null, error: { message: "boom" } } });

    await expect(fetchCatalogActivity("a1")).rejects.toThrow("boom");
  });
});