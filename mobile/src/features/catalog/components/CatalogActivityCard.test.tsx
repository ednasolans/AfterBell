import { fireEvent, within, screen } from "@testing-library/react-native";

import { formatDate } from "@/lib/dates";

import {
  makeActivity,
  makeCatalogActivity,
  renderWithQuery,
} from "../testFixtures";
import { CatalogActivityCard } from "./CatalogActivityCard";

jest.mock("../api/addFavourite", () => ({ addFavourite: jest.fn() }));
jest.mock("../api/removeFavourite", () => ({ removeFavourite: jest.fn() }));

describe("CatalogActivityCard", () => {
  it("keeps the heart outside the card button, so buttons are not nested", async () => {
    const onPress = jest.fn();
    const screen = await renderWithQuery(
      <CatalogActivityCard
        activity={makeActivity({ title: "Piano" })}
        providerName="Sports Club"
        isFavourite={false}
        onPress={onPress}
      />,
    );

    const card = screen.getByLabelText("Open Piano");
    expect(
      within(card).queryByLabelText("Save Piano in favourites"),
    ).toBeNull();
    expect(screen.getByLabelText("Save Piano in favourites")).toBeTruthy();

    await fireEvent.press(card);
    expect(onPress).toHaveBeenCalled();
  });
});

function cardProps(item: ReturnType<typeof makeCatalogActivity>) {
  return {
    activity: item.activity,
    providerName: item.provider.contact?.name ?? null,
    isFavourite: item.isFavourite,
  };
}

describe("CatalogActivityCard events", () => {
  it.each(["2099-07-01", "2099-07-15"])(
    "shows event dates through %s and opens the existing detail action",
    async (endDate) => {
      const onPress = jest.fn();
      await renderWithQuery(
        <CatalogActivityCard
          {...cardProps(
            makeCatalogActivity({
              activity: makeActivity({
                type: "event",
                startDate: "2099-07-01",
                endDate,
                schedule: [],
              }),
            }),
          )}
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
    await renderWithQuery(
      <CatalogActivityCard
        {...cardProps(
          makeCatalogActivity({
            activity: makeActivity({ type: "event", schedule: [] }),
          }),
        )}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Event")).toBeOnTheScreen();
    expect(screen.queryByText(/undefined|null/)).not.toBeOnTheScreen();
    expect(screen.queryByText("Finished")).not.toBeOnTheScreen();
  });

  it("keeps regular activity cards without an event label or dates", async () => {
    await renderWithQuery(
      <CatalogActivityCard
        {...cardProps(makeCatalogActivity())}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Saturday workshop")).toBeOnTheScreen();
    expect(screen.queryByText("Event")).not.toBeOnTheScreen();
    expect(screen.queryByText(/2099/)).not.toBeOnTheScreen();
  });

  it("keeps the finished marker for past events", async () => {
    await renderWithQuery(
      <CatalogActivityCard
        {...cardProps(
          makeCatalogActivity({
            activity: makeActivity({
              type: "event",
              startDate: "2000-07-01",
              endDate: "2000-07-01",
              schedule: [],
            }),
          }),
        )}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Event")).toBeOnTheScreen();
    expect(screen.getByText(formatDate("2000-07-01"))).toBeOnTheScreen();
    expect(screen.getByText("Finished")).toBeOnTheScreen();
  });
});
