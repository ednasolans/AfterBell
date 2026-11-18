import { NO_SEARCH_FILTERS } from "@/lib/searchFilters";
import { createQueryBuilderMock } from "@/test-utils/supabaseQueryMock";

import { makeActivity } from "../testFixtures";
import { searchCatalogActivities } from "./searchCatalogActivities";

const mockSearch = jest.fn();
const mockProfiles = jest.fn();
const mockContacts = jest.fn();
const mockFrom = jest.fn();

jest.mock("./searchActivities", () => ({
  searchActivities: (...args: unknown[]) => mockSearch(...args),
}));
jest.mock("./fetchApprovedProfiles", () => ({
  fetchApprovedProfiles: (ids: string[]) => mockProfiles(ids),
}));
jest.mock("./fetchContacts", () => ({
  fetchContacts: (ids: string[]) => mockContacts(ids),
}));
jest.mock("@/lib/supabase", () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

const PROFILE = { provider_id: "p1", headline: "Club", description: "Desc" };
const CONTACT = {
  name: "Sports Club",
  email: null,
  phoneNumber: null,
  website: null,
};

beforeEach(() => {
  jest.resetAllMocks();
  mockProfiles.mockResolvedValue(new Map([["p1", PROFILE]]));
  mockContacts.mockResolvedValue(new Map([["p1", CONTACT]]));
});

const PROFILE_ID = "family-profile-1";

describe("searchCatalogActivities", () => {
  it("adds the provider and the favourite to each result, in the search order", async () => {
    mockSearch.mockResolvedValue([
      makeActivity({ id: "a2", title: "Second", isTutor: true }),
      makeActivity({ id: "a1", title: "First" }),
    ]);
    const favourites = createQueryBuilderMock({
      data: [{ activity_id: "a1" }],
      error: null,
    });
    mockFrom.mockReturnValue(favourites);

    const result = await searchCatalogActivities(
      "club",
      NO_SEARCH_FILTERS,
      1,
      PROFILE_ID,
    );

    expect(mockSearch).toHaveBeenCalledWith("club", NO_SEARCH_FILTERS, 1);
    expect(mockProfiles).toHaveBeenCalledWith(["p1"]);
    expect(mockFrom).toHaveBeenCalledWith("favourites");
    expect(favourites.eq).toHaveBeenCalledWith("family_profile_id", PROFILE_ID);
    expect(favourites.in).toHaveBeenCalledWith("activity_id", ["a2", "a1"]);
    expect(
      result.map((item) => [
        item.activity.id,
        item.activity.isTutor,
        item.provider.contact?.name,
        item.isFavourite,
      ]),
    ).toEqual([
      ["a2", true, "Sports Club", false],
      ["a1", false, "Sports Club", true],
    ]);
  });

  it("does not read providers or favourites when nothing is found", async () => {
    mockSearch.mockResolvedValue([]);

    expect(await searchCatalogActivities("zzz")).toEqual([]);
    expect(mockProfiles).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("leaves out an activity whose provider has no approved profile", async () => {
    mockSearch.mockResolvedValue([
      makeActivity({ id: "a1" }),
      makeActivity({ id: "a2", providerId: "p2" }),
    ]);
    mockFrom.mockReturnValue(createQueryBuilderMock({ data: [], error: null }));

    const result = await searchCatalogActivities("club");

    expect(result.map((item) => item.activity.id)).toEqual(["a1"]);
  });

  it("fails when the favourites cannot be read", async () => {
    mockSearch.mockResolvedValue([makeActivity()]);
    mockFrom.mockReturnValue(
      createQueryBuilderMock({ data: null, error: { message: "boom" } }),
    );

    await expect(
      searchCatalogActivities("club", NO_SEARCH_FILTERS, 0, PROFILE_ID),
    ).rejects.toThrow("boom");
  });

  it("marks nothing as saved without a family profile, without reading favourites", async () => {
    mockSearch.mockResolvedValue([makeActivity({ id: "a1" })]);

    const result = await searchCatalogActivities("club");

    expect(result.map((item) => item.isFavourite)).toEqual([false]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
