import { fireEvent, waitFor } from "@testing-library/react-native";

import { renderWithQuery } from "../testFixtures";
import { CategoryShortcuts } from "./CategoryShortcuts";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

const mockAvailable = jest.fn();
jest.mock("../api/fetchAvailableFilters", () => ({
  fetchAvailableFilters: () => mockAvailable(),
}));

beforeEach(() => {
  mockAvailable.mockReset();
});

describe("CategoryShortcuts", () => {
  it("shows the categories of the catalogue, marking the selected ones", async () => {
    mockAvailable.mockResolvedValue({
      categories: ["music", "board_games"],
      cities: [],
      prices: [],
    });
    const screen = await renderWithQuery(
      <CategoryShortcuts selected={["music"]} onToggle={jest.fn()} />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: "Board games" }),
      ).toBeTruthy(),
    );
    expect(
      screen.getByRole("checkbox", { name: "Music" }).props.accessibilityState,
    ).toEqual({ checked: true });
    expect(
      screen.getByRole("checkbox", { name: "Board games" }).props
        .accessibilityState,
    ).toEqual({ checked: false });
  });

  it("offers the categories the app knows until the catalogue loads", async () => {
    mockAvailable.mockReturnValue(new Promise(() => undefined));
    const screen = await renderWithQuery(
      <CategoryShortcuts selected={[]} onToggle={jest.fn()} />,
    );

    expect(screen.getByRole("checkbox", { name: "Football" })).toBeTruthy();
  });

  it("toggles a category", async () => {
    mockAvailable.mockReturnValue(new Promise(() => undefined));
    const onToggle = jest.fn();
    const screen = await renderWithQuery(
      <CategoryShortcuts selected={[]} onToggle={onToggle} />,
    );

    await fireEvent.press(screen.getByRole("checkbox", { name: "Swimming" }));

    expect(onToggle).toHaveBeenCalledWith("swimming");
  });
});
