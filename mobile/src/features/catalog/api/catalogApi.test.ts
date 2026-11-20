import { type Tables } from "@/lib/database.types";

import { fetchCatalogActivities } from "./fetchCatalogActivities";
import { fetchCatalogActivity } from "./fetchCatalogActivity";

type QueryResult = { data: unknown; error: { message: string } | null };
type Call = [string, unknown[]];

const PROFILE_ID = "family-profile-1";

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (name: string, args?: unknown) => mockRpc(name, args),
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
    Object.entries({
      activity_capacity: { data: [{ taken_places: 3 }], error: null },
      ...tables,
    }).map(([table, result]) => [table, query(result)]),
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
  // The embedded favourites are filtered by the family profile
  favourites: [] as { activity_id: string }[],
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
  location: null,
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

    const result = await fetchCatalogActivities(PROFILE_ID);

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
    expect(queries.activities.calls).toContainEqual([
      "eq",
      ["status", "published"],
    ]);
  });

  it("leaves the contact details empty when the provider has no technical sheet", async () => {
    mockTables({
      public_approved_provider_profiles: { data: [profileRow], error: null },
      activities: { data: [activityRow], error: null },
      public_provider_contacts: { data: [], error: null },
    });

    const result = await fetchCatalogActivities(PROFILE_ID);

    expect(result[0].provider.contact).toBeNull();
    expect(result[0].provider.headline).toBe("Football for all ages");
  });

  it("returns nothing, without reading activities, when no profile is approved", async () => {
    mockTables({
      public_approved_provider_profiles: { data: [], error: null },
    });

    const result = await fetchCatalogActivities(PROFILE_ID);

    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns nothing, without reading contact details, when there are no published activities", async () => {
    mockTables({
      public_approved_provider_profiles: { data: [profileRow], error: null },
      activities: { data: [], error: null },
    });

    const result = await fetchCatalogActivities(PROFILE_ID);

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

    const result = await fetchCatalogActivities(PROFILE_ID);

    expect(result.map((item) => item.activity.id)).toEqual(["a1"]);
  });

  it("fails when the profiles cannot be read", async () => {
    mockTables({
      public_approved_provider_profiles: {
        data: null,
        error: { message: "no profiles" },
      },
    });

    await expect(fetchCatalogActivities(PROFILE_ID)).rejects.toThrow(
      "no profiles",
    );
  });

  it("fails when the activities cannot be read", async () => {
    mockTables({
      public_approved_provider_profiles: { data: [profileRow], error: null },
      activities: { data: null, error: { message: "boom" } },
    });

    await expect(fetchCatalogActivities(PROFILE_ID)).rejects.toThrow("boom");
  });

  it("fails when the contact details cannot be read", async () => {
    mockTables({
      public_approved_provider_profiles: { data: [profileRow], error: null },
      activities: { data: [activityRow], error: null },
      public_provider_contacts: { data: null, error: { message: "no sheets" } },
    });

    await expect(fetchCatalogActivities(PROFILE_ID)).rejects.toThrow(
      "no sheets",
    );
  });

  it("keeps the activities that have finished", async () => {
    mockTables({
      public_approved_provider_profiles: { data: [profileRow], error: null },
      activities: {
        data: [
          {
            ...activityRow,
            id: "finished",
            type: "temporary",
            start_date: "2020-01-01",
            end_date: "2020-01-02",
          },
          activityRow,
        ],
        error: null,
      },
      public_provider_contacts: { data: [sheetRow], error: null },
    });

    const result = await fetchCatalogActivities(PROFILE_ID);

    expect(result.map((item) => item.activity.id)).toEqual(["finished", "a1"]);
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

    const [item] = await fetchCatalogActivities(PROFILE_ID);

    expect(item.provider.contact).toBeNull();
  });
});

describe("fetchCatalogActivity", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it("returns the published activity with its profile, contact details and address", async () => {
    const languages = [{ language: "Catalan", level: "C1" }];
    const queries = mockTables({
      activities: {
        data: {
          ...activityRow,
          category: "language",
          is_tutor: true,
          languages,
        },
        error: null,
      },
      public_approved_provider_profiles: { data: [profileRow], error: null },
      public_provider_contacts: { data: [sheetRow], error: null },
      addresses: { data: addressRow, error: null },
    });

    const result = await fetchCatalogActivity("a1", PROFILE_ID);

    expect(queries.activities.calls).toContainEqual([
      "select",
      ["*, languages(language, level), favourites(activity_id)"],
    ]);
    expect(result?.activity).toMatchObject({
      id: "a1",
      isTutor: true,
      languages,
    });
    expect(result?.provider).toEqual(provider);
    expect(result?.address).toBe("Main Street 1, Lleida");
  });

  it("returns null when the activity does not exist or is not published", async () => {
    const queries = mockTables({ activities: { data: null, error: null } });

    expect(await fetchCatalogActivity("missing", PROFILE_ID)).toBeNull();
    expect(queries.activities.calls).toContainEqual([
      "eq",
      ["status", "published"],
    ]);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("returns the number of people enrolled", async () => {
    mockTables({
      activities: { data: activityRow, error: null },
      public_approved_provider_profiles: { data: [profileRow], error: null },
      public_provider_contacts: { data: [sheetRow], error: null },
      addresses: { data: addressRow, error: null },
    });

    const result = await fetchCatalogActivity("a1", PROFILE_ID);

    expect(result?.enrolledCount).toBe(3);
    expect(mockRpc).toHaveBeenCalledWith("activity_capacity", {
      p_activity_id: "a1",
    });
  });

  it("counts 0 when the activity has no capacity row", async () => {
    mockTables({
      activity_capacity: { data: [], error: null },
      activities: { data: activityRow, error: null },
      public_approved_provider_profiles: { data: [profileRow], error: null },
      public_provider_contacts: { data: [sheetRow], error: null },
      addresses: { data: addressRow, error: null },
    });

    expect((await fetchCatalogActivity("a1", PROFILE_ID))?.enrolledCount).toBe(
      0,
    );
  });

  it("returns the activity without the counter when it cannot be read", async () => {
    mockTables({
      activity_capacity: { data: null, error: { message: "boom" } },
      activities: { data: activityRow, error: null },
      public_approved_provider_profiles: { data: [profileRow], error: null },
      public_provider_contacts: { data: [sheetRow], error: null },
      addresses: { data: addressRow, error: null },
    });

    const result = await fetchCatalogActivity("a1", PROFILE_ID);

    expect(result?.activity.id).toBe("a1");
    expect(result?.enrolledCount).toBeNull();
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

    expect(await fetchCatalogActivity("a1", PROFILE_ID)).toBeNull();
  });

  it("returns null when the provider has no approved profile", async () => {
    mockTables({
      activities: { data: activityRow, error: null },
      public_approved_provider_profiles: { data: [], error: null },
      public_provider_contacts: { data: [sheetRow], error: null },
      addresses: { data: addressRow, error: null },
    });

    expect(await fetchCatalogActivity("a1", PROFILE_ID)).toBeNull();
  });

  it("leaves the contact details and the address empty when they cannot be found", async () => {
    mockTables({
      activities: { data: activityRow, error: null },
      public_approved_provider_profiles: { data: [profileRow], error: null },
      public_provider_contacts: { data: [], error: null },
      addresses: { data: null, error: null },
    });

    const result = await fetchCatalogActivity("a1", PROFILE_ID);

    expect(result?.provider.contact).toBeNull();
    expect(result?.address).toBeNull();
  });

  it("fails when the activity cannot be read", async () => {
    mockTables({ activities: { data: null, error: { message: "boom" } } });

    await expect(fetchCatalogActivity("a1", PROFILE_ID)).rejects.toThrow(
      "boom",
    );
  });
});

describe("favourites in the catalog", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  const savedRow = { ...activityRow, favourites: [{ activity_id: "a1" }] };

  it("says which activities of the list the family profile saved, in the same query", async () => {
    const queries = mockTables({
      public_approved_provider_profiles: { data: [profileRow], error: null },
      activities: {
        data: [savedRow, { ...activityRow, id: "a2" }],
        error: null,
      },
      public_provider_contacts: { data: [sheetRow], error: null },
    });

    const result = await fetchCatalogActivities(PROFILE_ID);

    expect(result.map((item) => [item.activity.id, item.isFavourite])).toEqual([
      ["a1", true],
      ["a2", false],
    ]);
    expect(queries.activities.calls).toContainEqual([
      "select",
      ["*, favourites(activity_id)"],
    ]);
    expect(queries.activities.calls).toContainEqual([
      "eq",
      ["favourites.family_profile_id", PROFILE_ID],
    ]);
  });

  it("marks nothing as saved without a family profile", async () => {
    const queries = mockTables({
      public_approved_provider_profiles: { data: [profileRow], error: null },
      activities: { data: [savedRow], error: null },
      public_provider_contacts: { data: [sheetRow], error: null },
    });

    const result = await fetchCatalogActivities(null);

    expect(result[0].isFavourite).toBe(false);
    expect(
      queries.activities.calls.some(([, args]) =>
        args.includes("favourites.family_profile_id"),
      ),
    ).toBe(false);
  });

  it("says whether the family profile saved the activity of the detail", async () => {
    mockTables({
      activities: { data: savedRow, error: null },
      public_approved_provider_profiles: { data: [profileRow], error: null },
      public_provider_contacts: { data: [sheetRow], error: null },
      addresses: { data: addressRow, error: null },
    });

    expect((await fetchCatalogActivity("a1", PROFILE_ID))?.isFavourite).toBe(
      true,
    );
  });

  it("filters the favourites of the detail by the family profile", async () => {
    const queries = mockTables({
      activities: { data: savedRow, error: null },
      public_approved_provider_profiles: { data: [profileRow], error: null },
      public_provider_contacts: { data: [sheetRow], error: null },
      addresses: { data: addressRow, error: null },
    });

    await fetchCatalogActivity("a1", PROFILE_ID);

    expect(queries.activities.calls).toContainEqual([
      "eq",
      ["favourites.family_profile_id", PROFILE_ID],
    ]);
  });

  it("the detail is not a favourite without a family profile", async () => {
    mockTables({
      activities: { data: savedRow, error: null },
      public_approved_provider_profiles: { data: [profileRow], error: null },
      public_provider_contacts: { data: [sheetRow], error: null },
      addresses: { data: addressRow, error: null },
    });

    expect((await fetchCatalogActivity("a1", null))?.isFavourite).toBe(false);
  });

  it("an activity that is not saved is not a favourite", async () => {
    mockTables({
      activities: { data: activityRow, error: null },
      public_approved_provider_profiles: { data: [profileRow], error: null },
      public_provider_contacts: { data: [sheetRow], error: null },
      addresses: { data: addressRow, error: null },
    });

    expect((await fetchCatalogActivity("a1", PROFILE_ID))?.isFavourite).toBe(
      false,
    );
  });
});
