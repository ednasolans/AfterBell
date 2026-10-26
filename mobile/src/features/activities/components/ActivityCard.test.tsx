import { render, screen } from "@testing-library/react-native";

import { ACTIVITY } from "@/test-utils/activityFixtures";

import { ActivityCard } from "./ActivityCard";

describe("ActivityCard", () => {
  it("shows the activity details and actions", async () => {
    await render(
      <ActivityCard
        activity={ACTIVITY}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        isDeleting={false}
      />,
    );

    expect(screen.getByText("Swimming for kids")).toBeOnTheScreen();
    expect(screen.getByText("Whole year")).toBeOnTheScreen();
    expect(screen.getByText("Ages: 7-9, 10-12")).toBeOnTheScreen();
    expect(screen.getByText("30 € per month")).toBeOnTheScreen();
  });
});
