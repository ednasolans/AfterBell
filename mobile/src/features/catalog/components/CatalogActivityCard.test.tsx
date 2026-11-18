import { fireEvent, within } from "@testing-library/react-native";

import { makeActivity, renderWithQuery } from "../testFixtures";
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

  it("has no heart without a family profile", async () => {
    const screen = await renderWithQuery(
      <CatalogActivityCard
        activity={makeActivity({ title: "Piano" })}
        providerName="Sports Club"
        isFavourite={false}
        onPress={jest.fn()}
      />,
      null,
    );

    expect(screen.getByLabelText("Open Piano")).toBeTruthy();
    expect(screen.queryByLabelText("Save Piano in favourites")).toBeNull();
  });
});
