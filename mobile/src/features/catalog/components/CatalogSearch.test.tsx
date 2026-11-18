import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { NO_SEARCH_FILTERS } from "@/lib/searchFilters";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { SEARCH_PAGE_SIZE } from "../api/searchActivities";
import {
  makeActivity,
  makeCatalogActivity,
  renderWithQuery,
} from "../testFixtures";
import { CatalogSearch, SEARCH_DEBOUNCE_MS } from "./CatalogSearch";

// The tests never reach the database: every request is mocked below
jest.mock("@/lib/supabase", () => ({ supabase: {} }));

const mockList = jest.fn();
const mockSearch = jest.fn();
const mockCount = jest.fn();

jest.mock("../api/fetchCatalogActivities", () => ({
  fetchCatalogActivities: () => mockList(),
}));
jest.mock("../api/searchCatalogActivities", () => ({
  searchCatalogActivities: (...args: unknown[]) => mockSearch(...args),
}));
jest.mock("../api/fetchAvailableFilters", () => ({
  fetchAvailableFilters: () =>
    Promise.resolve({
      categories: ["music", "swimming"],
      cities: ["Lleida", "Tàrrega"],
      prices: [{ period: "per_month", min: 30, max: 80 }],
    }),
}));
jest.mock("../api/searchActivities", () => ({
  ...jest.requireActual("../api/searchActivities"),
  countSearchActivities: (...args: unknown[]) => mockCount(...args),
}));

const FULL_LIST = makeCatalogActivity({
  activity: makeActivity({ id: "all-1", title: "Every activity" }),
});

function result(id: string, title: string, isTutor = false) {
  return makeCatalogActivity({
    activity: makeActivity({ id, title, isTutor }),
  });
}

async function renderSearch(onOpen = jest.fn()) {
  const screen = await renderWithQuery(<CatalogSearch onOpen={onOpen} />);
  await waitFor(() => expect(screen.getByText("Every activity")).toBeTruthy());
  return screen;
}

// Types a text. The search starts after the pause of the debounce (real
// timers: the timing itself is tested in useDebouncedValue.test.ts), so the
// checks that follow wait with waitFor/findBy.
async function type(
  screen: Awaited<ReturnType<typeof renderSearch>>,
  text: string,
) {
  await fireEvent.changeText(screen.getByLabelText("Search activities"), text);
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  mockList.mockResolvedValue([FULL_LIST]);
  mockCount.mockResolvedValue(2);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("CatalogSearch", () => {
  it("shows the full list and no clear button before typing", async () => {
    const screen = await renderSearch();

    expect(screen.getByLabelText("Search activities")).toBeTruthy();
    expect(screen.queryByLabelText("Clear search")).toBeNull();
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("searches once after a pause, not once per key", async () => {
    mockSearch.mockResolvedValue([]);
    const screen = await renderSearch();
    const input = screen.getByLabelText("Search activities");

    await fireEvent.changeText(input, "m");
    await fireEvent.changeText(input, "mu");
    await fireEvent.changeText(input, "mus");
    expect(mockSearch).not.toHaveBeenCalled();

    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1));
    expect(mockSearch).toHaveBeenCalledWith("mus", NO_SEARCH_FILTERS, 0);
  });

  it("searches at once when the text is submitted", async () => {
    mockSearch.mockResolvedValue([]);
    const screen = await renderSearch();
    const input = screen.getByLabelText("Search activities");

    await fireEvent.changeText(input, "  music ");
    await fireEvent(input, "submitEditing");

    // Sooner than the pause of the debounce
    await waitFor(
      () =>
        expect(mockSearch).toHaveBeenCalledWith("music", NO_SEARCH_FILTERS, 0),
      { timeout: SEARCH_DEBOUNCE_MS / 2 },
    );
  });

  it("shows the results with their count, tutor offers included", async () => {
    mockSearch.mockResolvedValue([
      result("r1", "Piano lessons"),
      result("r2", "Maths tutor", true),
    ]);
    const screen = await renderSearch();

    await type(screen, "lessons");

    await waitFor(() =>
      expect(screen.getByText("2 activities found")).toBeTruthy(),
    );
    expect(screen.getByText("Piano lessons")).toBeTruthy();
    expect(screen.getByText("Maths tutor")).toBeTruthy();
    expect(screen.queryByText("Every activity")).toBeNull();
  });

  it("says when one activity is found", async () => {
    mockSearch.mockResolvedValue([result("r1", "Piano lessons")]);
    mockCount.mockResolvedValue(1);
    const screen = await renderSearch();

    await type(screen, "piano");

    await waitFor(() =>
      expect(screen.getByText("1 activity found")).toBeTruthy(),
    );
  });

  it("loads the next page at the end of the list", async () => {
    const firstPage = Array.from({ length: SEARCH_PAGE_SIZE }, (_, index) =>
      result(`r${index}`, `Result ${index}`),
    );
    mockSearch
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([result("last", "Last result")]);
    const screen = await renderSearch();
    await type(screen, "result");
    await waitFor(() => expect(screen.getByText("Result 0")).toBeTruthy());

    await fireEvent(screen.getByTestId("search-results"), "endReached");

    await waitFor(() =>
      expect(mockSearch).toHaveBeenLastCalledWith(
        "result",
        NO_SEARCH_FILTERS,
        1,
      ),
    );
  });

  it("does not ask for another page after a short one", async () => {
    mockSearch.mockResolvedValue([result("r1", "Only result")]);
    const screen = await renderSearch();
    await type(screen, "only");
    await waitFor(() => expect(screen.getByText("Only result")).toBeTruthy());

    await fireEvent(screen.getByTestId("search-results"), "endReached");

    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it("shows a message with a suggestion when nothing is found", async () => {
    mockSearch.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    const screen = await renderSearch();

    await type(screen, "zzz");

    await waitFor(() =>
      expect(screen.getByText('No activities match "zzz".')).toBeTruthy(),
    );
    expect(screen.getByText(/Try other words/)).toBeTruthy();
  });

  it("shows an error and searches again on retry", async () => {
    mockSearch
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([result("r1", "Piano lessons")]);
    const screen = await renderSearch();

    await type(screen, "piano");
    await waitFor(() =>
      expect(
        screen.getByText("The search could not be completed."),
      ).toBeTruthy(),
    );

    await fireEvent.press(screen.getByText("Try again"));

    await waitFor(() => expect(screen.getByText("Piano lessons")).toBeTruthy());
  });

  it("asks for one more character instead of searching with one", async () => {
    const screen = await renderSearch();

    await type(screen, "a");

    expect(
      await screen.findByText("Type at least 2 characters to search."),
    ).toBeTruthy();
    expect(screen.getByText("Every activity")).toBeTruthy();
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("clears the text and goes back to the full list", async () => {
    mockSearch.mockResolvedValue([result("r1", "Piano lessons")]);
    const screen = await renderSearch();
    await type(screen, "piano");
    await waitFor(() => expect(screen.getByText("Piano lessons")).toBeTruthy());

    await fireEvent.press(screen.getByLabelText("Clear search"));

    await waitFor(() =>
      expect(screen.getByText("Every activity")).toBeTruthy(),
    );
    expect(screen.getByLabelText("Search activities").props.value).toBe("");
    expect(screen.queryByLabelText("Clear search")).toBeNull();
  });

  it("keeps the text and the results when an activity is opened", async () => {
    mockSearch.mockResolvedValue([result("r1", "Piano lessons")]);
    const onOpen = jest.fn();
    const screen = await renderSearch(onOpen);
    await type(screen, "piano");
    await waitFor(() => expect(screen.getByText("Piano lessons")).toBeTruthy());

    await fireEvent.press(screen.getByLabelText("Open Piano lessons"));

    expect(onOpen).toHaveBeenCalledWith("r1");
    expect(screen.getByLabelText("Search activities").props.value).toBe(
      "piano",
    );
    expect(screen.getByText("Piano lessons")).toBeTruthy();
  });

  describe("filters", () => {
    const LLEIDA_MUSIC = {
      ...NO_SEARCH_FILTERS,
      categories: ["music"],
      city: "Lleida",
    };

    // Chooses music in the category row, then Lleida in the panel
    async function filterMusicInLleida(
      screen: Awaited<ReturnType<typeof renderSearch>>,
    ) {
      await fireEvent.press(screen.getByRole("checkbox", { name: "Music" }));
      await fireEvent.press(screen.getByRole("button", { name: /^Filters/ }));
      await fireEvent.press(
        await screen.findByRole("button", { name: /^City/ }),
      );
      await fireEvent.press(screen.getByRole("radio", { name: "Lleida" }));
      await fireEvent.press(
        screen.getByRole("button", { name: "Apply filters" }),
      );
    }

    it("searches with the filters alone, without a text", async () => {
      mockSearch.mockResolvedValue([result("r1", "Piano lessons")]);
      const screen = await renderSearch();

      await filterMusicInLleida(screen);

      await waitFor(() =>
        expect(screen.getByText("Piano lessons")).toBeTruthy(),
      );
      expect(mockSearch).toHaveBeenCalledWith("", LLEIDA_MUSIC, 0);
      expect(mockCount).toHaveBeenCalledWith("", LLEIDA_MUSIC);
      expect(screen.queryByRole("header", { name: "Filters" })).toBeNull();
      expect(screen.queryByText("Every activity")).toBeNull();
    });

    it("combines the filters with the text", async () => {
      mockSearch.mockResolvedValue([result("r1", "Piano lessons")]);
      const screen = await renderSearch();
      await type(screen, "piano");
      await waitFor(() =>
        expect(mockSearch).toHaveBeenCalledWith("piano", NO_SEARCH_FILTERS, 0),
      );

      await filterMusicInLleida(screen);

      await waitFor(() =>
        expect(mockSearch).toHaveBeenCalledWith("piano", LLEIDA_MUSIC, 0),
      );
    });

    it("keeps the filters when the text is too short", async () => {
      mockSearch.mockResolvedValue([]);
      const screen = await renderSearch();
      await filterMusicInLleida(screen);

      await type(screen, "p");

      expect(
        await screen.findByText("Type at least 2 characters to search."),
      ).toBeTruthy();
      expect(mockSearch).toHaveBeenLastCalledWith("", LLEIDA_MUSIC, 0);
      expect(screen.queryByText("Every activity")).toBeNull();
    });

    it("says when nothing matches the filters", async () => {
      mockSearch.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      const screen = await renderSearch();

      await filterMusicInLleida(screen);

      expect(
        await screen.findByText("No activities match these filters."),
      ).toBeTruthy();
      expect(
        screen.getByText("Remove some filters to see more activities."),
      ).toBeTruthy();
    });

    it("removes one filter from its chip", async () => {
      mockSearch.mockResolvedValue([result("r1", "Piano lessons")]);
      const screen = await renderSearch();
      await filterMusicInLleida(screen);

      await fireEvent.press(
        await screen.findByRole("button", { name: "Remove filter Lleida" }),
      );

      await waitFor(() =>
        expect(mockSearch).toHaveBeenLastCalledWith(
          "",
          { ...LLEIDA_MUSIC, city: null },
          0,
        ),
      );
      expect(
        screen.getByRole("button", { name: "Filters, 1 active" }),
      ).toBeTruthy();
    });

    it("clears every filter and goes back to the full list", async () => {
      mockSearch.mockResolvedValue([result("r1", "Piano lessons")]);
      const screen = await renderSearch();
      await filterMusicInLleida(screen);
      await screen.findByText("Piano lessons");

      await fireEvent.press(screen.getByRole("button", { name: "Clear all" }));

      await waitFor(() =>
        expect(screen.getByText("Every activity")).toBeTruthy(),
      );
      expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
    });

    it("keeps the filters when an activity is opened", async () => {
      mockSearch.mockResolvedValue([result("r1", "Piano lessons")]);
      const onOpen = jest.fn();
      const screen = await renderSearch(onOpen);
      await filterMusicInLleida(screen);

      await fireEvent.press(await screen.findByLabelText("Open Piano lessons"));

      expect(onOpen).toHaveBeenCalledWith("r1");
      expect(
        screen.getByRole("button", { name: "Filters, 2 active" }),
      ).toBeTruthy();
      expect(screen.getByText("Piano lessons")).toBeTruthy();
    });

    it("opens the panel with the applied filters and closes it without changes", async () => {
      mockSearch.mockResolvedValue([]);
      const screen = await renderSearch();
      await filterMusicInLleida(screen);

      await fireEvent.press(
        screen.getByRole("button", { name: "Filters, 2 active" }),
      );
      expect(
        await screen.findByRole("button", { name: "City: Lleida" }),
      ).toBeTruthy();
      await fireEvent.press(
        screen.getByRole("button", { name: "Close filters" }),
      );

      expect(screen.queryByRole("header", { name: "Filters" })).toBeNull();
      expect(
        screen.getByRole("button", { name: "Filters, 2 active" }),
      ).toBeTruthy();
    });
  });

  describe("profile and categories", () => {
    it("shows the section title", async () => {
      const screen = await renderSearch();

      expect(
        screen.getByRole("header", { name: "Discover activities" }),
      ).toBeTruthy();
    });

    it("filters by a category of the row and removes it on a second press", async () => {
      mockSearch.mockResolvedValue([result("r1", "Piano lessons")]);
      const screen = await renderSearch();

      await fireEvent.press(screen.getByRole("checkbox", { name: "Music" }));

      await waitFor(() =>
        expect(mockSearch).toHaveBeenCalledWith(
          "",
          { ...NO_SEARCH_FILTERS, categories: ["music"] },
          0,
        ),
      );
      expect(
        screen.getByRole("button", { name: "Remove filter Music" }),
      ).toBeTruthy();

      await fireEvent.press(screen.getByRole("checkbox", { name: "Music" }));

      await waitFor(() =>
        expect(screen.getByText("Every activity")).toBeTruthy(),
      );
    });

    it("applies the ages of the profile as a filter the customer can remove", async () => {
      mockSearch.mockResolvedValue([result("r1", "Piano lessons")]);
      const screen = await renderWithQuery(
        <CatalogSearch
          onOpen={jest.fn()}
          profileAges={{ ageMin: 8, ageMax: 8 }}
        />,
      );

      await waitFor(() =>
        expect(mockSearch).toHaveBeenCalledWith(
          "",
          { ...NO_SEARCH_FILTERS, ageMin: 8, ageMax: 8 },
          0,
        ),
      );

      await fireEvent.press(
        screen.getByRole("button", { name: "Remove filter Age 8" }),
      );

      await waitFor(() =>
        expect(screen.getByText("Every activity")).toBeTruthy(),
      );
    });

    it("applies the ages again when the profile changes", async () => {
      mockSearch.mockResolvedValue([]);
      const screen = await render(
        <CatalogSearch
          onOpen={jest.fn()}
          profileAges={{ ageMin: 8, ageMax: 8 }}
        />,
        // rerender keeps the wrapper, so the query client stays the same
        { wrapper: createQueryClientWrapper(createTestQueryClient()) },
      );
      await screen.findByRole("button", { name: "Remove filter Age 8" });

      await screen.rerender(
        <CatalogSearch
          onOpen={jest.fn()}
          profileAges={{ ageMin: 18, ageMax: null }}
        />,
      );

      expect(
        await screen.findByRole("button", {
          name: "Remove filter From 18 years",
        }),
      ).toBeTruthy();
      expect(
        screen.queryByRole("button", { name: "Remove filter Age 8" }),
      ).toBeNull();
    });
  });
});
