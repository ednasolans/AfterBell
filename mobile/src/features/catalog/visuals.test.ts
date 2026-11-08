import { ACTIVITY_IMAGES, activityImage } from "./visuals";

describe("activityImage", () => {
  it("returns the image of a known category", () => {
    expect(activityImage("football")).toBe(ACTIVITY_IMAGES.football);
  });

  it("returns the generic image for a category the app does not know yet", () => {
    expect(activityImage("board_games")).toBe(ACTIVITY_IMAGES.other);
  });
});
