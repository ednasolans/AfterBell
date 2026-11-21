import {
  ACTIVITY_ICONS,
  ACTIVITY_IMAGES,
  activityIcon,
  activityImage,
} from "./activityVisuals";

describe("activityImage", () => {
  it("returns the image of a known category", () => {
    expect(activityImage("football")).toBe(ACTIVITY_IMAGES.football);
  });

  it("returns the generic image for a category the app does not know yet", () => {
    expect(activityImage("board_games")).toBe(ACTIVITY_IMAGES.other);
  });
});

describe("activityIcon", () => {
  it("returns the icon of a known category", () => {
    expect(activityIcon("music")).toBe(ACTIVITY_ICONS.music);
  });

  it("returns the generic icon for a category the app does not know yet", () => {
    expect(activityIcon("board_games")).toBe(ACTIVITY_ICONS.other);
  });
});
