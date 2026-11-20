import { fetchAvailableFilters } from "./fetchAvailableFilters";

const mockRpc = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: { rpc: (name: string) => mockRpc(name) },
}));

beforeEach(() => mockRpc.mockReset());

describe("fetchAvailableFilters", () => {
  it("returns the categories, cities and price ranges", async () => {
    const data = {
      categories: ["dance", "music"],
      cities: ["Lleida", "Tàrrega"],
      prices: [{ period: "per_month", min: 30, max: 80 }],
    };
    mockRpc.mockResolvedValue({ data, error: null });

    await expect(fetchAvailableFilters()).resolves.toEqual(data);
    expect(mockRpc).toHaveBeenCalledWith("available_activity_filters");
  });

  it("throws the error of the database", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "offline" } });

    await expect(fetchAvailableFilters()).rejects.toThrow("offline");
  });
});
