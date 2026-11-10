import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { addFavourite } from "../api/addFavourite";
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

const other = makeCatalogActivity({ activity: makeActivity({ id: "a2" }) });

// The three screens that show the heart of activity a1, with data loaded
function seed(isFavourite: boolean) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData<CatalogActivity[]>(catalogKeys.list(), [
    makeCatalogActivity({ isFavourite }),
    other,
  ]);
  queryClient.setQueryData<CatalogActivityDetail>(catalogKeys.detail("a1"), {
    ...makeCatalogActivity({ isFavourite }),
    address: null,
    enrolledCount: 0,
  });
  queryClient.setQueryData<FavouriteActivity[]>(
    catalogKeys.favourites(),
    isFavourite ? [makeFavourite()] : [],
  );
  return queryClient;
}

function read(queryClient: ReturnType<typeof createTestQueryClient>) {
  return {
    list: queryClient
      .getQueryData<CatalogActivity[]>(catalogKeys.list())
      ?.map((item) => item.isFavourite),
    detail: queryClient.getQueryData<CatalogActivityDetail>(
      catalogKeys.detail("a1"),
    )?.isFavourite,
    favourites: queryClient
      .getQueryData<FavouriteActivity[]>(catalogKeys.favourites())
      ?.map((item) => item.activity.id),
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
      wrapper: createQueryClientWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ activityId: "a1", save: false });
    });

    await waitFor(() =>
      expect(read(queryClient)).toEqual({
        list: [false, false],
        detail: false,
        favourites: [],
      }),
    );
  });

  it("saves a favourite and reads the favourites again", async () => {
    jest.mocked(addFavourite).mockResolvedValue(undefined);
    const queryClient = seed(false);
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useToggleFavourite(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ activityId: "a1", save: true });
    });

    expect(addFavourite).toHaveBeenCalledWith("a1");
    expect(read(queryClient).list).toEqual([true, false]);
    expect(read(queryClient).detail).toBe(true);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: catalogKeys.favourites(),
    });
  });

  it("puts every screen back and shows an alert when the request fails", async () => {
    jest.mocked(removeFavourite).mockRejectedValue(new Error("offline"));
    const queryClient = seed(true);
    // The list is not read again here, so the rollback can be seen
    jest.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const { result } = await renderHook(() => useToggleFavourite(), {
      wrapper: createQueryClientWrapper(queryClient),
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
    });
  });
});
