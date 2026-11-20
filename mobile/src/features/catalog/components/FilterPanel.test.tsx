import { fireEvent, waitFor } from "@testing-library/react-native";

import { NO_SEARCH_FILTERS, type SearchFilters } from "@/lib/searchFilters";

import { type AvailableFilters } from "../api/fetchAvailableFilters";
import { renderWithQuery } from "../testFixtures";
import { FilterPanel } from "./FilterPanel";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

const mockAvailable = jest.fn();
jest.mock("../api/fetchAvailableFilters", () => ({
  fetchAvailableFilters: () => mockAvailable(),
}));

const AVAILABLE: AvailableFilters = {
  categories: ["music", "board_games"],
  cities: ["Lleida", "Tàrrega"],
  prices: [
    { period: "per_hour", min: 10, max: 20 },
    { period: "per_month", min: 30, max: 80 },
  ],
};

async function renderPanel(filters: SearchFilters = NO_SEARCH_FILTERS) {
  const onApply = jest.fn();
  const onClose = jest.fn();
  const screen = await renderWithQuery(
    <FilterPanel filters={filters} onApply={onApply} onClose={onClose} />,
  );
  return { screen, onApply, onClose };
}

type Screen = Awaited<ReturnType<typeof renderPanel>>["screen"];

async function choose(screen: Screen, field: RegExp, option: string) {
  await fireEvent.press(screen.getByRole("button", { name: field }));
  await fireEvent.press(screen.getByRole("radio", { name: option }));
}

async function apply(screen: Screen) {
  await fireEvent.press(screen.getByRole("button", { name: "Apply filters" }));
}

beforeEach(() => {
  mockAvailable.mockReset();
  mockAvailable.mockResolvedValue(AVAILABLE);
});

describe("FilterPanel", () => {
  it("applies no filters when nothing is chosen", async () => {
    const { screen, onApply } = await renderPanel();
    await screen.findByRole("button", { name: /^City/ });

    await apply(screen);

    expect(onApply).toHaveBeenCalledWith(NO_SEARCH_FILTERS);
  });

  it("offers the categories of the API and applies several", async () => {
    const { screen, onApply } = await renderPanel();
    await screen.findByRole("button", { name: /^City/ });

    await fireEvent.press(screen.getByRole("button", { name: /^Category/ }));
    await fireEvent.press(
      screen.getByRole("checkbox", { name: "Board games" }),
    );
    await fireEvent.press(screen.getByRole("checkbox", { name: "Music" }));
    await fireEvent.press(screen.getByRole("button", { name: "Done" }));
    await apply(screen);

    expect(onApply).toHaveBeenCalledWith({
      ...NO_SEARCH_FILTERS,
      categories: ["board_games", "music"],
    });
  });

  it("applies an age range", async () => {
    const { screen, onApply } = await renderPanel();

    await fireEvent.changeText(screen.getByLabelText("Minimum age"), "6");
    await fireEvent.changeText(screen.getByLabelText("Maximum age"), "9");
    await apply(screen);

    expect(onApply).toHaveBeenCalledWith({
      ...NO_SEARCH_FILTERS,
      ageMin: 6,
      ageMax: 9,
    });
  });

  it("shows the age error and does not apply a minimum above the maximum", async () => {
    const { screen, onApply } = await renderPanel();

    await fireEvent.changeText(screen.getByLabelText("Minimum age"), "10");
    await fireEvent.changeText(screen.getByLabelText("Maximum age"), "9");
    expect(
      screen.queryByText(
        "The minimum age cannot be higher than the maximum age.",
      ),
    ).toBeNull();
    await apply(screen);

    expect(
      screen.getByText(
        "The minimum age cannot be higher than the maximum age.",
      ),
    ).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("offers the cities of the API and applies one", async () => {
    const { screen, onApply } = await renderPanel();
    await screen.findByRole("button", { name: /^City/ });

    await choose(screen, /^City/, "Tàrrega");
    await apply(screen);

    expect(onApply).toHaveBeenCalledWith({
      ...NO_SEARCH_FILTERS,
      city: "Tàrrega",
    });
  });

  it("goes back to any city", async () => {
    const { screen, onApply } = await renderPanel({
      ...NO_SEARCH_FILTERS,
      city: "Lleida",
    });
    await screen.findByRole("button", { name: "City: Lleida" });

    await choose(screen, /^City/, "Any city");
    await apply(screen);

    expect(onApply).toHaveBeenCalledWith(NO_SEARCH_FILTERS);
  });

  it("asks for the prices once a period is chosen, with its range", async () => {
    const { screen, onApply } = await renderPanel();
    await screen.findByRole("button", { name: /^Price period/ });
    expect(screen.queryByLabelText("Maximum price")).toBeNull();

    await choose(screen, /^Price period/, "Per month");
    expect(
      screen.getByText("Prices per month go from 30 € to 80 €."),
    ).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Maximum price"), "40,5");
    await apply(screen);

    expect(onApply).toHaveBeenCalledWith({
      ...NO_SEARCH_FILTERS,
      priceMax: 40.5,
      pricePeriod: "per_month",
    });
  });

  it("shows the price error and does not apply a minimum above the maximum", async () => {
    const { screen, onApply } = await renderPanel();
    await screen.findByRole("button", { name: /^Price period/ });

    await choose(screen, /^Price period/, "Per hour");
    await fireEvent.changeText(screen.getByLabelText("Minimum price"), "20");
    await fireEvent.changeText(screen.getByLabelText("Maximum price"), "10");
    await apply(screen);

    expect(
      screen.getByText(
        "The minimum price cannot be higher than the maximum price.",
      ),
    ).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("drops the prices when going back to any price", async () => {
    const { screen, onApply } = await renderPanel({
      ...NO_SEARCH_FILTERS,
      priceMin: 10,
      pricePeriod: "per_hour",
    });
    await screen.findByLabelText("Minimum price");

    await choose(screen, /^Price period/, "Any price");
    await apply(screen);

    expect(screen.queryByLabelText("Minimum price")).toBeNull();
    expect(onApply).toHaveBeenCalledWith(NO_SEARCH_FILTERS);
  });

  it("starts from the applied filters", async () => {
    const { screen } = await renderPanel({
      ...NO_SEARCH_FILTERS,
      categories: ["music"],
      ageMin: 6,
      city: "Lleida",
    });

    expect(
      await screen.findByRole("button", { name: "City: Lleida" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Category: Music" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Minimum age").props.value).toBe("6");
  });

  it("resets every field without applying", async () => {
    const { screen, onApply } = await renderPanel({
      ...NO_SEARCH_FILTERS,
      ageMin: 6,
      city: "Lleida",
    });
    await screen.findByRole("button", { name: "City: Lleida" });

    await fireEvent.press(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByLabelText("Minimum age").props.value).toBe("");
    expect(screen.getByRole("button", { name: "City: Any city" })).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("closes without applying", async () => {
    const { screen, onApply, onClose } = await renderPanel();

    await fireEvent.press(
      screen.getByRole("button", { name: "Close filters" }),
    );

    expect(onClose).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("shows a spinner while the options load", async () => {
    mockAvailable.mockReturnValue(new Promise(() => undefined));
    const { screen } = await renderPanel();

    expect(screen.getByLabelText("Loading cities and prices")).toBeTruthy();
    // The rest of the panel can be used meanwhile
    expect(screen.getByLabelText("Minimum age")).toBeTruthy();
  });

  it("keeps the panel usable when the options fail, and loads them again", async () => {
    mockAvailable
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(AVAILABLE);
    const { screen } = await renderPanel();

    expect(
      await screen.findByText("The cities and prices could not be loaded."),
    ).toBeTruthy();
    expect(screen.getByLabelText("Minimum age")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^City/ })).toBeTruthy(),
    );
  });
});
