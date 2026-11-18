import { render, screen } from "@testing-library/react-native";

import { formatDate } from "@/lib/dates";

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
    expect(screen.getByText("Activity")).toBeOnTheScreen();
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

describe("event cards", () => {
  it.each(["2099-07-01", "2099-07-15"])(
    "shows the event label and its dates through %s without weekly slots",
    async (endDate) => {
      await render(
        <ActivityCard
          activity={{
            ...ACTIVITY,
            type: "event",
            startDate: "2099-07-01",
            endDate,
            schedule: [],
          }}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          isDeleting={false}
        />,
      );

      const expected =
        endDate === "2099-07-01"
          ? formatDate(endDate)
          : `${formatDate("2099-07-01")} – ${formatDate(endDate)}`;
      expect(screen.getByText("Event")).toBeOnTheScreen();
      expect(screen.getByText(expected)).toBeOnTheScreen();
      expect(screen.getByText("Draft")).toBeOnTheScreen();
      expect(screen.queryByText(/undefined|null/)).not.toBeOnTheScreen();
    },
  );

  it("shows an event's optional weekly schedule", async () => {
    await render(
      <ActivityCard
        activity={{
          ...ACTIVITY,
          type: "event",
          startDate: "2099-07-01",
          endDate: "2099-07-15",
        }}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        isDeleting={false}
      />,
    );

    expect(screen.getByText(/tuesday 17:00–18:00/)).toBeOnTheScreen();
  });

  it("handles an older event without dates", async () => {
    await render(
      <ActivityCard
        activity={{ ...ACTIVITY, type: "event", schedule: [] }}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        isDeleting={false}
      />,
    );

    expect(screen.getByText("Event")).toBeOnTheScreen();
    expect(screen.queryByText(/undefined|null/)).not.toBeOnTheScreen();
  });
});
