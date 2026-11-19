import { fireEvent, waitFor } from "@testing-library/react-native";

import { NO_SEARCH_FILTERS } from "@/lib/searchFilters";

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
const mockSummary = jest.fn();

jest.mock("../api/fetchCatalogActivities", () => ({
  fetchCatalogActivities: () => mockList(),
}));
jest.mock("../api/searchCatalogActivities", () => ({
  searchCatalogActivities: (...args: unknown[]) => mockSearch(...args),
}));
jest.mock("@/features/search-summary/api/fetchSearchSummary", () => ({
  fetchSearchSummary: (...args: unknown[]) => mockSummary(...args),
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
  mockSummary.mockResolvedValue({ status: "UNAVAILABLE" });
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
  it("shows the AI summary of the results above them", async () => {
    mockSearch.mockResolvedValue([result("r1", "Piano lessons")]);
    mockSummary.mockResolvedValue({
      status: "READY",
      summary: "One piano activity for children.",
    });
    const screen = await renderSearch();

    await type(screen, " piano ");

    expect(
      await screen.findByText("One piano activity for children."),
    ).toBeTruthy();
    expect(screen.getByText("AI summary")).toBeTruthy();
    expect(screen.getByText("Piano lessons")).toBeTruthy();
    expect(mockSummary).toHaveBeenCalledWith(
      { ...NO_SEARCH_FILTERS, query: "piano" },
      expect.anything(),
    );
  });

  it("asks for no AI summary when nothing is found", async () => {
    mockSearch.mockResolvedValue([]);
    const screen = await renderSearch();

    await type(screen, "nothing");

    expect(
      await screen.findByText('No activities match "nothing".'),
    ).toBeTruthy();
    expect(mockSummary).not.toHaveBeenCalled();
    expect(screen.queryByText("AI summary")).toBeNull();
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
});
