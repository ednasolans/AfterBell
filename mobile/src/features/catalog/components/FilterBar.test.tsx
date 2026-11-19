import { fireEvent, render } from "@testing-library/react-native";

import { NO_SEARCH_FILTERS, type SearchFilters } from "@/lib/searchFilters";

import { FilterBar } from "./FilterBar";

const FILTERS: SearchFilters = {
  ...NO_SEARCH_FILTERS,
  categories: ["music"],
  city: "Lleida",
};

async function renderBar(filters: SearchFilters) {
  const onChange = jest.fn();
  const onOpenPanel = jest.fn();
  const screen = await render(
    <FilterBar
      filters={filters}
      onChange={onChange}
      onOpenPanel={onOpenPanel}
    />,
  );
  return { screen, onChange, onOpenPanel };
}

describe("FilterBar", () => {
  it("shows only the button without filters", async () => {
    const { screen } = await renderBar(NO_SEARCH_FILTERS);

    expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });

  it("opens the panel", async () => {
    const { screen, onOpenPanel } = await renderBar(NO_SEARCH_FILTERS);

    await fireEvent.press(screen.getByRole("button", { name: "Filters" }));

    expect(onOpenPanel).toHaveBeenCalled();
  });

  it("shows how many filters are active and one chip for each", async () => {
    const { screen } = await renderBar(FILTERS);

    expect(
      screen.getByRole("button", { name: "Filters, 2 active" }),
    ).toBeTruthy();
    expect(screen.getByText("Music")).toBeTruthy();
    expect(screen.getByText("Lleida")).toBeTruthy();
  });

  it("removes one filter from its chip", async () => {
    const { screen, onChange } = await renderBar(FILTERS);

    await fireEvent.press(
      screen.getByRole("button", { name: "Remove filter Lleida" }),
    );

    expect(onChange).toHaveBeenCalledWith({ ...FILTERS, city: null });
  });

  it("clears every filter", async () => {
    const { screen, onChange } = await renderBar(FILTERS);

    await fireEvent.press(screen.getByRole("button", { name: "Clear all" }));

    expect(onChange).toHaveBeenCalledWith(NO_SEARCH_FILTERS);
  });
});
