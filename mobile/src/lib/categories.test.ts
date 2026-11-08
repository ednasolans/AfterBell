import { fetchCategories } from "@/lib/categories";import { supabase } from "@/lib/supabase";
import { createQueryBuilderMock } from "@/test-utils/supabaseQueryMock";

// Replace the real client: tests must not need a database
jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn() },
}));

function mockQuery(result: Parameters<typeof createQueryBuilderMock>[0]) {
  const builder = createQueryBuilderMock(result);
  jest
    .mocked(supabase.from)
    .mockReturnValue(builder as unknown as ReturnType<typeof supabase.from>);
  return builder;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("fetchCategories", () => {
  it("returns the catalogue ordered by label", async () => {
    const query = mockQuery({
      data: [
        { name: "tennis", category_type: "individual" },
        { name: "football", category_type: "collective" },
        { name: "art", category_type: "individual" },
      ],
      error: null,
    });

    await expect(fetchCategories()).resolves.toEqual([
      { name: "art", type: "individual" },
      { name: "football", type: "collective" },
      { name: "tennis", type: "individual" },
    ]);
    expect(supabase.from).toHaveBeenCalledWith("categories");
    expect(query.select).toHaveBeenCalledWith("name, category_type");
  });

  it("returns an empty list when the catalogue is empty", async () => {
    mockQuery({ data: [], error: null });

    await expect(fetchCategories()).resolves.toEqual([]);
  });

  it("throws the Supabase error", async () => {
    mockQuery({ data: null, error: { message: "permission denied" } });

    await expect(fetchCategories()).rejects.toThrow("permission denied");
  });
});
