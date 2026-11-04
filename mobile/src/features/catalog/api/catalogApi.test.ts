import { type Tables } from "@/lib/database.types";

import { fetchCatalogActivities } from "./fetchCatalogActivities";
import { fetchCatalogActivity } from "./fetchCatalogActivity";

type QueryResult = { data: unknown; error: { message: string } | null };
type Call = [string, unknown[]];

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (name: string) => mockRpc(name),
  },
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
  const builderOf = (name: string) => queries[name].builder;
  mockFrom.mockImplementation(builderOf);
  mockRpc.mockImplementation(builderOf);
  return queries;
}

const activityRow = {
  id: "a1",
  provider_id: "p1",
  address_id: "ad1",
  title: "Saturday workshop",
  description: "Fun for everyone",
  category: "football",
  type: "whole_year",
  target_age_ranges: ["7-9", "10-12"],
  schedule: [{ day: "monday", startTime: "17:00", endTime: "18:00" }],
  price: 15,
  price_period: "per_month",
  max_participants: 20,
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
  street: null,
  number: null,
  floor: null,
  door: null,
  postal_code: null,
  city: "Lleida",
  province: null,
  country: null,
  created_at: "2026-10-01T10:00:00Z",
};

const provider = {
  id: "p1",
  headline: "Football for all ages",
  description: "A friendly club",
  contact: {
    name: "Sports Club",
    email: "club@example.com",
    phoneNumber: "600000000",
    website: "https://club.example.com",
  },
};

describe("fetchCatalogActivities", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it("returns the published activities of providers with an approved profile", async () => {
    const queries = mockTables({
      public_approved_provider_profiles: { data: [profileRow], error: null },
      activities: { data: [activityRow], error: null },
      public_provider_contacts: { data: [sheetRow], error: null },
    });

    const result = await fetchCatalogActivities();

    expect(result).toHaveLength(1);
    expect(result[0].activity).toMatchObject({
      id: "a1",
      providerId: "p1",
      title: "Saturday workshop",
      targetAgeRanges: ["7-9", "10-12"],
      price: 15,
      pricePeriod: "per_month",
    });
    expect(result[0].provider).toEqual(provider);
    expect(queries.activities.calls).toContainEqual([
      "in",
      ["provider_id", ["p1"]],
    ]);
  });

  it("leaves the contact details empty when the provider has no technical sheet", async () => {
    mockTables({
      public_approved_provider_profiles: { data: [profileRow], error: null },
      activities: { data: [activityRow], error: null },
      public_provider_contacts: { data: [], error: null },
    });

    const result = await fetchCatalogActivities();

    expect(result[0].provider.contact).toBeNull();
    expect(result[0].provider.headline).toBe("Football for all ages");
  });

  it("returns nothing, without reading activities, when no profile is approved", async () => {
    mockTables({
      public_approved_provider_profiles: { data: [], error: null },
    });

    const result = await fetchCatalogActivities();

    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns nothing, without reading contact details, when there are no published activities", async () => {
    mockTables({
      public_approved_provider_profiles: { data: [profileRow], error: null },
      activities: { data: [], error: null },
    });

    const result = await fetchCatalogActivities();

    expect(result).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalledWith("public_provider_contacts");
  });

  it("never returns an activity whose provider has no approved profile", async () => {
    mockTables({
      public_approved_provider_profiles: { data: [profileRow], error: null },
      activities: {
        data: [activityRow, { ...activityRow, id: "a2", provider_id: "p2" }],
        error: null,
      },
      public_provider_contacts: { data: [sheetRow], error: null },
    });

    const result = await fetchCatalogActivities();

    expect(result.map((item) => item.activity.id)).toEqual(["a1"]);
  });

  it("fails when the profiles cannot be read", async () => {
    mockTables({
      public_approved_provider_profiles: {
        data: null,
        error: { message: "no profiles" },
      },
    });

    await expect(fetchCatalogActivities()).rejects.toThrow("no profiles");
  });

  it("fails when the activities cannot be read", async () => {
    mockTables({
      public_approved_provider_profiles: { data: [profileRow], error: null },
      activities: { data: null, error: { message: "boom" } },
    });

    await expect(fetchCatalogActivities()).rejects.toThrow("boom");
  });

  it("fails when the contact details cannot be read", async () => {
    mockTables({
      public_approved_provider_profiles: { data: [profileRow], error: null },
      activities: { data: [activityRow], error: null },
      public_provider_contacts: { data: null, error: { message: "no sheets" } },
    });

    await expect(fetchCatalogActivities()).rejects.toThrow("no sheets");
  });

  it("ignores the contact details of other providers", async () => {
    mockTables({
      public_approved_provider_profiles: { data: [profileRow], error: null },
      activities: { data: [activityRow], error: null },
      public_provider_contacts: {
        data: [{ ...sheetRow, provider_id: "other" }],
        error: null,
      },
    });

    const [item] = await fetchCatalogActivities();

    expect(item.provider.contact).toBeNull();
  });
});

describe("fetchCatalogActivity", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it("returns the published activity with its profile, contact details and address", async () => {
    mockTables({
      activities: { data: activityRow, error: null },
      public_approved_provider_profiles: { data: [profileRow], error: null },
      public_provider_contacts: { data: [sheetRow], error: null },
      addresses: { data: addressRow, error: null },
    });

    const result = await fetchCatalogActivity("a1");

    expect(result?.activity.id).toBe("a1");
    expect(result?.provider).toEqual(provider);
    expect(result?.address).toBe("Main Street 1, Lleida");
  });

  it("returns null when the activity does not exist or is not published", async () => {
    mockTables({ activities: { data: null, error: null } });

    expect(await fetchCatalogActivity("missing")).toBeNull();
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("ignores the approved profiles of other providers", async () => {
    mockTables({
      activities: { data: activityRow, error: null },
      public_approved_provider_profiles: {
        data: [{ ...profileRow, provider_id: "other" }],
        error: null,
      },
      public_provider_contacts: { data: [sheetRow], error: null },
      addresses: { data: addressRow, error: null },
    });

    expect(await fetchCatalogActivity("a1")).toBeNull();
  });

  it("returns null when the provider has no approved profile", async () => {
    mockTables({
      activities: { data: activityRow, error: null },
      public_approved_provider_profiles: { data: [], error: null },
      public_provider_contacts: { data: [sheetRow], error: null },
      addresses: { data: addressRow, error: null },
    });

    expect(await fetchCatalogActivity("a1")).toBeNull();
  });

  it("leaves the contact details and the address empty when they cannot be found", async () => {
    mockTables({
      activities: { data: activityRow, error: null },
      public_approved_provider_profiles: { data: [profileRow], error: null },
      public_provider_contacts: { data: [], error: null },
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
