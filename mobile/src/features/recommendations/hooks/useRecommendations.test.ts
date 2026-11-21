import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { fetchRecommendations } from "../api/fetchRecommendations";
import { type RecommendationsPage } from "../types";
import { recommendationKeys } from "@/lib/recommendationKeys";
import {
  RECOMMENDATIONS_STALE_MS,
  useRecommendations,
} from "./useRecommendations";

jest.mock("../api/fetchRecommendations", () => ({
  fetchRecommendations: jest.fn(),
}));

function page(overrides: Partial<RecommendationsPage>): RecommendationsPage {
  return { status: "OK", recommendations: [], hasMore: false, ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useRecommendations", () => {
  it("loads the first page", async () => {
    jest
      .mocked(fetchRecommendations)
      .mockResolvedValue(page({ status: "NO_CITY" }));
    const { result } = await renderHook(() => useRecommendations(null), {
      wrapper: createQueryClientWrapper(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchRecommendations).toHaveBeenCalledWith(0, null);
    expect(result.current.data?.pages[0].status).toBe("NO_CITY");
    expect(result.current.hasNextPage).toBe(false);
  });

  it("loads the next page only while the function says there are more", async () => {
    jest
      .mocked(fetchRecommendations)
      .mockResolvedValueOnce(page({ hasMore: true }))
      .mockResolvedValueOnce(page({ hasMore: false }));
    const { result } = await renderHook(() => useRecommendations(null), {
      wrapper: createQueryClientWrapper(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(fetchRecommendations).toHaveBeenLastCalledWith(1, null);
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("asks in the order of the active profile, with a cache per profile", async () => {
    jest.mocked(fetchRecommendations).mockResolvedValue(page({}));
    const client = createTestQueryClient();
    const wrapper = createQueryClientWrapper(client);
    const laia = await renderHook(() => useRecommendations("profile-2"), {
      wrapper,
    });
    await waitFor(() => expect(laia.result.current.isSuccess).toBe(true));
    const marc = await renderHook(() => useRecommendations("profile-1"), {
      wrapper,
    });
    await waitFor(() => expect(marc.result.current.isSuccess).toBe(true));
    expect(fetchRecommendations).toHaveBeenCalledWith(0, "profile-2");
    expect(fetchRecommendations).toHaveBeenCalledWith(0, "profile-1");
    expect(
      client.getQueryState(recommendationKeys.forProfile("profile-2")),
    ).toBeDefined();
  });

  it("does not ask while it is disabled", async () => {
    const { result } = await renderHook(() => useRecommendations(null, false), {
      wrapper: createQueryClientWrapper(createTestQueryClient()),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchRecommendations).not.toHaveBeenCalled();
  });

  it("reports an error to retry", async () => {
    jest.mocked(fetchRecommendations).mockRejectedValue(new Error("boom"));
    const { result } = await renderHook(() => useRecommendations(null), {
      wrapper: createQueryClientWrapper(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("boom");
  });

  it("does not ask again for a short time", async () => {
    jest.mocked(fetchRecommendations).mockResolvedValue(page({}));
    const client = createTestQueryClient();
    const wrapper = createQueryClientWrapper(client);
    const first = await renderHook(() => useRecommendations(null), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    await renderHook(() => useRecommendations(null), { wrapper });
    expect(fetchRecommendations).toHaveBeenCalledTimes(1);
    expect(
      client.getQueryState(recommendationKeys.forProfile(null))?.isInvalidated,
    ).toBe(false);
    expect(RECOMMENDATIONS_STALE_MS).toBe(5 * 60_000);
  });
});
