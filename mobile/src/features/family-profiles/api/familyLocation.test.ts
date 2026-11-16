import { supabase } from "@/lib/supabase";
import { createQueryBuilderMock } from "@/test-utils/supabaseQueryMock";

import { fetchFamilyCity, saveFamilyLocation } from "./familyLocation";

jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

function mockGroup(result: {
  data: unknown;
  error: { message: string } | null;
}) {
  const builder = createQueryBuilderMock(result);
  jest
    .mocked(supabase.from)
    .mockReturnValue(builder as unknown as ReturnType<typeof supabase.from>);
  return builder;
}

function mockRpc(error: { message: string } | null) {
  jest
    .mocked(supabase.rpc)
    .mockResolvedValue({ data: null, error } as unknown as Awaited<
      ReturnType<typeof supabase.rpc>
    >);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("fetchFamilyCity", () => {
  it("reads only the city of the family group", async () => {
    const builder = mockGroup({ data: { city: "Lleida" }, error: null });

    expect(await fetchFamilyCity()).toBe("Lleida");
    expect(supabase.from).toHaveBeenCalledWith("family_groups");
    expect(builder.select).toHaveBeenCalledWith("city");
  });

  it("returns null when the family has no town yet", async () => {
    mockGroup({ data: { city: null }, error: null });
    expect(await fetchFamilyCity()).toBeNull();
  });

  it("returns null when there is no family group", async () => {
    mockGroup({ data: null, error: null });
    expect(await fetchFamilyCity()).toBeNull();
  });

  it("fails when the group cannot be read", async () => {
    mockGroup({ data: null, error: { message: "boom" } });
    await expect(fetchFamilyCity()).rejects.toThrow("boom");
  });
});

describe("saveFamilyLocation", () => {
  it("sends the town without spaces and its point", async () => {
    mockRpc(null);

    await saveFamilyLocation({
      city: "  Lleida ",
      coordinates: { latitude: 41.6176, longitude: 0.62 },
    });

    expect(supabase.rpc).toHaveBeenCalledWith("set_family_location", {
      p_city: "Lleida",
      p_latitude: 41.6176,
      p_longitude: 0.62,
    });
  });

  it("fails with the message of the database", async () => {
    mockRpc({ message: "The location is not valid" });

    await expect(
      saveFamilyLocation({
        city: "Lleida",
        coordinates: { latitude: 99, longitude: 0 },
      }),
    ).rejects.toThrow("The location is not valid");
  });
});
