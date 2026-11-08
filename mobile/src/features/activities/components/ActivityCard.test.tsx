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

  it("shows whether customers can see the activity", async () => {
    await render(
      <ActivityCard
        activity={ACTIVITY}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        isDeleting={false}
      />,
    );
    expect(screen.getByText("Draft")).toBeOnTheScreen();

    await render(
      <ActivityCard
        activity={{ ...ACTIVITY, status: "published" }}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        isDeleting={false}
      />,
    );
    expect(screen.getByText("Published")).toBeOnTheScreen();
  });

  it("shows a category the app does not know yet", async () => {
    await render(
      <ActivityCard
        activity={{ ...ACTIVITY, category: "board_games" }}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        isDeleting={false}
      />,
    );

    expect(screen.getByText("Board games")).toBeOnTheScreen();
  });

  it("shows the type of a temporary activity", async () => {
    await render(
      <ActivityCard
        activity={{ ...ACTIVITY, type: "temporary" }}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        isDeleting={false}
      />,
    );

    expect(screen.getByText("Temporary")).toBeOnTheScreen();
    expect(screen.queryByText("Whole year")).not.toBeOnTheScreen();
  });
});
