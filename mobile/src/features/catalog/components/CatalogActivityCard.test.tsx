import { fireEvent, render, screen } from "@testing-library/react-native";

import { formatDate } from "@/lib/dates";

import { makeActivity, makeCatalogActivity } from "../testFixtures";
import { CatalogActivityCard } from "./CatalogActivityCard";

describe("CatalogActivityCard events", () => {
  it.each(["2099-07-01", "2099-07-15"])(
    "shows event dates through %s and opens the existing detail action",
    async (endDate) => {
      const onPress = jest.fn();
      await render(
        <CatalogActivityCard
          item={makeCatalogActivity({
            activity: makeActivity({
              type: "event",
              startDate: "2099-07-01",
              endDate,
              schedule: [],
            }),
          })}
          onPress={onPress}
        />,
      );

      const expected =
        endDate === "2099-07-01"
          ? formatDate(endDate)
          : `${formatDate("2099-07-01")} – ${formatDate(endDate)}`;
      expect(screen.getByText("Event")).toBeOnTheScreen();
      expect(screen.getByText(expected)).toBeOnTheScreen();
      expect(screen.getByText("Sports Club")).toBeOnTheScreen();
      expect(screen.getByText("15 € per month")).toBeOnTheScreen();
      expect(screen.queryByText("Finished")).not.toBeOnTheScreen();
      await fireEvent.press(
        screen.getByRole("button", {
          name: "Open Saturday workshop",
        }),
      );
      expect(onPress).toHaveBeenCalledTimes(1);
    },
  );

  it("handles older events without dates or a weekly schedule", async () => {
    await render(
      <CatalogActivityCard
        item={makeCatalogActivity({
          activity: makeActivity({ type: "event", schedule: [] }),
        })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Event")).toBeOnTheScreen();
    expect(screen.queryByText(/undefined|null/)).not.toBeOnTheScreen();
    expect(screen.queryByText("Finished")).not.toBeOnTheScreen();
  });

  it("keeps regular activity cards without an event label or dates", async () => {
    await render(
      <CatalogActivityCard item={makeCatalogActivity()} onPress={jest.fn()} />,
    );

    expect(screen.getByText("Saturday workshop")).toBeOnTheScreen();
    expect(screen.queryByText("Event")).not.toBeOnTheScreen();
    expect(screen.queryByText(/2099/)).not.toBeOnTheScreen();
  });

  it("keeps the finished marker for past events", async () => {
    await render(
      <CatalogActivityCard
        item={makeCatalogActivity({
          activity: makeActivity({
            type: "event",
            startDate: "2000-07-01",
            endDate: "2000-07-01",
            schedule: [],
          }),
        })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Event")).toBeOnTheScreen();
    expect(screen.getByText(formatDate("2000-07-01"))).toBeOnTheScreen();
    expect(screen.getByText("Finished")).toBeOnTheScreen();
  });
});
