import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import {
  makeActivity,
  makeFavourite,
  renderWithQuery,
  TEST_PROFILE_ID,
} from "../testFixtures";
import { FavouritesList } from "./FavouritesList";

const mockFetch = jest.fn();
const mockRemoveFavourite = jest.fn();

jest.mock("../api/fetchFavourites", () => ({
  fetchFavourites: (profileId: string) => mockFetch(profileId),
}));
jest.mock("../api/addFavourite", () => ({ addFavourite: jest.fn() }));
jest.mock("../api/removeFavourite", () => ({
  removeFavourite: (target: unknown) => mockRemoveFavourite(target),
}));

function renderList(onOpen = jest.fn(), onExplore = jest.fn()) {
  return renderWithQuery(
    <FavouritesList onOpen={onOpen} onExplore={onExplore} />,
  );
}

describe("FavouritesList", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockRemoveFavourite.mockReset();
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads the favourites of the active family profile", async () => {
    mockFetch.mockResolvedValue([]);

    await renderList();

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(TEST_PROFILE_ID),
    );
  });

  it("asks for a family profile when there is none, without loading anything", async () => {
    const { getByText } = await renderWithQuery(
      <FavouritesList onOpen={jest.fn()} onExplore={jest.fn()} />,
      null,
    );

    expect(getByText("Add a family profile to save favourites.")).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows the saved activities with the activity card and a full heart", async () => {
    mockFetch.mockResolvedValue([makeFavourite()]);

    const { findByText, getByText, getByLabelText } = await renderList();

    expect(await findByText("Saturday workshop")).toBeTruthy();
    expect(getByText("Sports Club")).toBeTruthy();
    expect(getByText("15 € per month")).toBeTruthy();
    expect(
      getByLabelText("Remove Saturday workshop from favourites"),
    ).toBeTruthy();
  });

  it("opens an available activity", async () => {
    mockFetch.mockResolvedValue([makeFavourite()]);
    const onOpen = jest.fn();

    const { findByLabelText } = await renderList(onOpen);
    await fireEvent.press(await findByLabelText("Open Saturday workshop"));

    expect(onOpen).toHaveBeenCalledWith("a1");
  });

  it("marks an activity that is no longer available and does not open it", async () => {
    mockFetch.mockResolvedValue([
      makeFavourite({
        activity: makeActivity({ title: "Old camp" }),
        available: false,
      }),
    ]);
    const onOpen = jest.fn();

    const { findByText, getByLabelText } = await renderList(onOpen);

    expect(await findByText("Not available")).toBeTruthy();
    await fireEvent.press(getByLabelText("Old camp, not available"));
    expect(onOpen).not.toHaveBeenCalled();
    // It can still be removed
    expect(getByLabelText("Remove Old camp from favourites")).toBeTruthy();
  });

  it("removes a favourite from the list at once", async () => {
    mockFetch.mockResolvedValue([makeFavourite()]);
    mockRemoveFavourite.mockReturnValue(new Promise(() => undefined));

    const { findByLabelText, queryByText } = await renderList();
    await fireEvent.press(
      await findByLabelText("Remove Saturday workshop from favourites"),
    );

    expect(mockRemoveFavourite).toHaveBeenCalledWith({
      familyProfileId: TEST_PROFILE_ID,
      activityId: "a1",
    });
    await waitFor(() => expect(queryByText("Saturday workshop")).toBeNull());
  });

  it("brings the favourite back and explains why when removing fails", async () => {
    mockFetch.mockResolvedValue([makeFavourite()]);
    mockRemoveFavourite.mockRejectedValue(new Error("Network request failed"));

    const { findByLabelText, findByText } = await renderList();
    await fireEvent.press(
      await findByLabelText("Remove Saturday workshop from favourites"),
    );

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Favourites",
        "Your favourites could not be updated. Please try again.",
      ),
    );
    expect(await findByText("Saturday workshop")).toBeTruthy();
  });

  it("shows an empty state that leads to the activities", async () => {
    mockFetch.mockResolvedValue([]);
    const onExplore = jest.fn();

    const { findByText, getByText } = await renderList(jest.fn(), onExplore);

    expect(
      await findByText("You have not saved any activities yet."),
    ).toBeTruthy();
    await fireEvent.press(getByText("Browse activities"));
    expect(onExplore).toHaveBeenCalled();
  });

  it("shows an error with a retry when the favourites cannot be loaded", async () => {
    mockFetch.mockRejectedValueOnce(new Error("boom"));
    mockFetch.mockResolvedValueOnce([makeFavourite()]);

    const { findByText } = await renderList();

    expect(
      await findByText("Your favourites could not be loaded."),
    ).toBeTruthy();
    await fireEvent.press(await findByText("Try again"));
    expect(await findByText("Saturday workshop")).toBeTruthy();
  });

  it("loads the favourites again on pull to refresh", async () => {
    mockFetch.mockResolvedValue([makeFavourite()]);

    const { findByText, getByTestId } = await renderList();
    await findByText("Saturday workshop");

    await act(async () => {
      getByTestId("favourites-list").props.refreshControl.props.onRefresh();
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });
});
