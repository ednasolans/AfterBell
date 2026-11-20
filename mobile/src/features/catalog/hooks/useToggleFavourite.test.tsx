import { type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { type ReactNode } from "react";
import { Alert } from "react-native";

import { NO_SEARCH_FILTERS } from "@/lib/searchFilters";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { addFavourite } from "../api/addFavourite";
import { FavouritesProfileProvider } from "../favouritesProfile";
import { removeFavourite } from "../api/removeFavourite";
import {
  makeActivity,
  makeCatalogActivity,
  makeFavourite,
} from "../testFixtures";
import {
  type CatalogActivity,
  type CatalogActivityDetail,
  type FavouriteActivity,
} from "../types";
import { catalogKeys } from "./catalogKeys";
import { useToggleFavourite } from "./useToggleFavourite";

jest.mock("../api/addFavourite", () => ({ addFavourite: jest.fn() }));
jest.mock("../api/removeFavourite", () => ({ removeFavourite: jest.fn() }));

const PROFILE = "marc";
const OTHER_PROFILE = "laia";

const other = makeCatalogActivity({ activity: makeActivity({ id: "a2" }) });
const searchKey = catalogKeys.search(PROFILE, "workshop", NO_SEARCH_FILTERS);

// The query client and the active family profile
function wrapper(queryClient: QueryClient, profileId: string | null = PROFILE) {
  const QueryWrapper = createQueryClientWrapper(queryClient);
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryWrapper>
        <FavouritesProfileProvider profileId={profileId}>
          {children}
        </FavouritesProfileProvider>
      </QueryWrapper>
    );
  };
}

// The four screens that show the heart of activity a1, with data loaded
function seed(isFavourite: boolean) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData<CatalogActivity[]>(catalogKeys.list(PROFILE), [
    makeCatalogActivity({ isFavourite }),
    other,
  ]);
  queryClient.setQueryData<CatalogActivityDetail>(
    catalogKeys.detail("a1", PROFILE),
    {
      ...makeCatalogActivity({ isFavourite }),
      address: null,
      enrolledCount: 0,
    },
  );
  queryClient.setQueryData<FavouriteActivity[]>(
    catalogKeys.favourites(PROFILE),
    isFavourite ? [makeFavourite()] : [],
  );
  queryClient.setQueryData<InfiniteData<CatalogActivity[]>>(searchKey, {
    pages: [[other], [makeCatalogActivity({ isFavourite })]],
    pageParams: [0, 1],
  });
  return queryClient;
}

function read(queryClient: ReturnType<typeof createTestQueryClient>) {
  return {
    list: queryClient
      .getQueryData<CatalogActivity[]>(catalogKeys.list(PROFILE))
      ?.map((item) => item.isFavourite),
    detail: queryClient.getQueryData<CatalogActivityDetail>(
      catalogKeys.detail("a1", PROFILE),
    )?.isFavourite,
    favourites: queryClient
      .getQueryData<FavouriteActivity[]>(catalogKeys.favourites(PROFILE))
      ?.map((item) => item.activity.id),
    search: queryClient
      .getQueryData<InfiniteData<CatalogActivity[]>>(searchKey)
      ?.pages.flat()
      .map((item) => item.isFavourite),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useToggleFavourite", () => {
  it("removes the favourite from every screen before the answer", async () => {
    jest.mocked(removeFavourite).mockReturnValue(new Promise(() => undefined));
    const queryClient = seed(true);
    const { result } = await renderHook(() => useToggleFavourite(), {
      wrapper: wrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ activityId: "a1", save: false });
    });

    await waitFor(() =>
      expect(read(queryClient)).toEqual({
        list: [false, false],
        detail: false,
        favourites: [],
        search: [false, false],
      }),
    );
  });

  it("saves a favourite and reads the favourites again", async () => {
    jest.mocked(addFavourite).mockResolvedValue(undefined);
    const queryClient = seed(false);
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useToggleFavourite(), {
      wrapper: wrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ activityId: "a1", save: true });
    });

    expect(addFavourite).toHaveBeenCalledWith({
      familyProfileId: PROFILE,
      activityId: "a1",
    });
    expect(read(queryClient).list).toEqual([true, false]);
    expect(read(queryClient).detail).toBe(true);
    expect(read(queryClient).search).toEqual([false, true]);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: catalogKeys.favourites(PROFILE),
    });
  });

  it("puts every screen back and shows an alert when the request fails", async () => {
    jest.mocked(removeFavourite).mockRejectedValue(new Error("offline"));
    const queryClient = seed(true);
    // The list is not read again here, so the rollback can be seen
    jest.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const { result } = await renderHook(() => useToggleFavourite(), {
      wrapper: wrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ activityId: "a1", save: false });
    });

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Favourites",
        "Your favourites could not be updated. Please try again.",
      ),
    );
    expect(read(queryClient)).toEqual({
      list: [true, false],
      detail: true,
      favourites: ["a1"],
      search: [false, true],
    });
  });

  it("does not change the hearts of another profile", async () => {
    jest.mocked(addFavourite).mockResolvedValue(undefined);
    const queryClient = seed(false);
    queryClient.setQueryData<CatalogActivity[]>(
      catalogKeys.list(OTHER_PROFILE),
      [makeCatalogActivity({ isFavourite: false })],
    );
    const { result } = await renderHook(() => useToggleFavourite(), {
      wrapper: wrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ activityId: "a1", save: true });
    });

    expect(
      queryClient
        .getQueryData<CatalogActivity[]>(catalogKeys.list(OTHER_PROFILE))
        ?.map((item) => item.isFavourite),
    ).toEqual([false]);
  });

  it("fails without a family profile, without sending anything", async () => {
    const queryClient = seed(false);
    jest.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const { result } = await renderHook(() => useToggleFavourite(), {
      wrapper: wrapper(queryClient, null),
    });

    await act(async () => {
      result.current.mutate({ activityId: "a1", save: true });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(addFavourite).not.toHaveBeenCalled();
  });
});
