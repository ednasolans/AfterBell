import { renderHook, waitFor } from "@testing-library/react-native";

import { fetchCategories } from "@/lib/categories";
import { categoriesKey, useCategories } from "@/lib/useCategories";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

jest.mock("@/lib/categories", () => ({ fetchCategories: jest.fn() }));

const CATEGORIES = [
  { name: "football", type: "collective" as const },
  { name: "music", type: "individual" as const },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useCategories", () => {
  it("loads the catalogue and caches it under its own key", async () => {
    jest.mocked(fetchCategories).mockResolvedValue(CATEGORIES);
    const queryClient = createTestQueryClient();

    const { result } = await renderHook(() => useCategories(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(CATEGORIES);
    expect(queryClient.getQueryData(categoriesKey)).toEqual(CATEGORIES);
  });

  it("does not reload the catalogue while it is fresh", async () => {
    jest.mocked(fetchCategories).mockResolvedValue(CATEGORIES);
    const wrapper = createQueryClientWrapper(createTestQueryClient());

    const first = await renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    const second = await renderHook(() => useCategories(), { wrapper });

    expect(second.result.current.data).toEqual(CATEGORIES);
    expect(fetchCategories).toHaveBeenCalledTimes(1);
  });

  it("reports the error when the catalogue cannot be loaded", async () => {
    jest.mocked(fetchCategories).mockRejectedValue(new Error("offline"));

    const { result } = await renderHook(() => useCategories(), {
      wrapper: createQueryClientWrapper(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("offline");
  });
});
