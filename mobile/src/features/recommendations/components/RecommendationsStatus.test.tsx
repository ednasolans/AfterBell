import { fireEvent, render, screen } from "@testing-library/react-native";

import { makeRecommendationActions } from "@/test-utils/recommendationFixtures";

import {
  EMPTY_RECOMMENDATIONS,
  type EmptyRecommendationStatus,
} from "../statusMessages";
import { RecommendationsStatus } from "./RecommendationsStatus";

async function renderStatus(status: EmptyRecommendationStatus) {
  const actions = makeRecommendationActions();
  await render(<RecommendationsStatus status={status} actions={actions} />);
  return actions;
}

describe("RecommendationsStatus", () => {
  it.each([
    ["NO_CITY", "Set your town", "setTown"],
    ["NO_PROFILES", "Add a profile", "addProfile"],
    ["INCOMPLETE_PROFILES", "Add interests", "completeProfile"],
  ] as const)(
    "%s: says what is missing and leads to complete it",
    async (status, button, action) => {
      const actions = await renderStatus(status);

      expect(
        screen.getByText(EMPTY_RECOMMENDATIONS[status].message),
      ).toBeOnTheScreen();
      expect(screen.getAllByRole("button")).toHaveLength(1);
      await fireEvent.press(screen.getByRole("button", { name: button }));
      expect(actions[action]).toHaveBeenCalledTimes(1);
    },
  );

  it("NO_MATCHES: offers the search and the full list", async () => {
    const actions = await renderStatus("NO_MATCHES");

    expect(
      screen.getByText("No activities fit your family in your town yet."),
    ).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole("button", { name: "Search activities" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "See all activities" }),
    );
    expect(actions.searchActivities).toHaveBeenCalledTimes(1);
    expect(actions.seeAllActivities).toHaveBeenCalledTimes(1);
    expect(actions.addProfile).not.toHaveBeenCalled();
  });
});
