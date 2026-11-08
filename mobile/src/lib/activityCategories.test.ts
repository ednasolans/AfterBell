import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
  categoryLabel,
  categoryOptions,
} from "./activityCategories";

describe("activity categories", () => {
  it("has a non-empty label for every category", () => {
    ACTIVITY_CATEGORIES.forEach((category) => {
      expect(ACTIVITY_CATEGORY_LABELS[category].trim()).not.toBe("");
    });
  });
});

describe("categoryLabel", () => {
  it("returns the label of a known category", () => {
    expect(categoryLabel("football")).toBe("Football");
  });

  it("builds a label for a category the app does not know yet", () => {
    expect(categoryLabel("board_games")).toBe("Board games");
  });

  it("capitalises a one-word unknown category", () => {
    expect(categoryLabel("chess")).toBe("Chess");
  });
});

describe("categoryOptions", () => {
  it("offers the categories of the database ordered by label", () => {
    expect(
      categoryOptions([{ name: "tennis" }, { name: "chess" }, { name: "art" }]),
    ).toEqual([
      { value: "art", label: "Art" },
      { value: "chess", label: "Chess" },
      { value: "tennis", label: "Tennis" },
    ]);
  });

  it("offers the known categories until the catalogue is loaded", () => {
    const options = categoryOptions(undefined);

    expect(options).toHaveLength(ACTIVITY_CATEGORIES.length);
    expect(options[0]).toEqual({ value: "art", label: "Art" });
  });

  it("offers nothing when the catalogue is empty", () => {
    expect(categoryOptions([])).toEqual([]);
  });
});
