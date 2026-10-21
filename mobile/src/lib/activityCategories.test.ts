import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
} from "./activityCategories";

describe("activity categories", () => {
  it("has a non-empty label for every category", () => {
    ACTIVITY_CATEGORIES.forEach((category) => {
      expect(ACTIVITY_CATEGORY_LABELS[category].trim()).not.toBe("");
    });
  });
});
