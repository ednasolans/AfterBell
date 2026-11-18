import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { formatDate } from "@/lib/dates";

import {
  makeActivity,
  makeCatalogActivity,
  makeProvider,
  renderWithQuery,
} from "../testFixtures";
import { CatalogList } from "./CatalogList";

const mockFetch = jest.fn();

jest.mock("../api/fetchCatalogActivities", () => ({
  fetchCatalogActivities: () => mockFetch(),
}));

const mockAddFavourite = jest.fn();
const mockRemoveFavourite = jest.fn();

jest.mock("../api/addFavourite", () => ({
  addFavourite: (id: string) => mockAddFavourite(id),
}));
jest.mock("../api/removeFavourite", () => ({
  removeFavourite: (id: string) => mockRemoveFavourite(id),
}));

describe("CatalogList", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("shows the title, provider, ages and price of each activity", async () => {
    mockFetch.mockResolvedValue([makeCatalogActivity()]);

    const { getByText } = await renderWithQuery(
      <CatalogList onOpen={jest.fn()} />,
    );

    await waitFor(() => expect(getByText("Saturday workshop")).toBeTruthy());
    expect(getByText("Sports Club")).toBeTruthy();
    expect(getByText("Ages 7–12")).toBeTruthy();
    expect(getByText("Mon, 17:00")).toBeTruthy();
    expect(getByText("15 € per month")).toBeTruthy();
  });

  it("shows the dates of a temporary activity", async () => {
    mockFetch.mockResolvedValue([
      makeCatalogActivity({
        activity: makeActivity({
          type: "temporary",
          startDate: "2099-07-01",
          endDate: "2099-07-15",
        }),
      }),
    ]);

    const { getByText } = await renderWithQuery(
      <CatalogList onOpen={jest.fn()} />,
    );

    await waitFor(() =>
      expect(
        getByText(`${formatDate("2099-07-01")} – ${formatDate("2099-07-15")}`),
      ).toBeTruthy(),
    );
  });

  it("marks an activity that has finished", async () => {
    mockFetch.mockResolvedValue([
      makeCatalogActivity({
        activity: makeActivity({
          type: "temporary",
          startDate: "2020-07-01",
          endDate: "2020-07-15",
        }),
      }),
    ]);

    const { getByText } = await renderWithQuery(
      <CatalogList onOpen={jest.fn()} />,
    );

    await waitFor(() => expect(getByText("Finished")).toBeTruthy());
  });

  it("does not mark an activity that has not finished", async () => {
    mockFetch.mockResolvedValue([
      makeCatalogActivity({
        activity: makeActivity({
          type: "temporary",
          startDate: "2099-07-01",
          endDate: "2099-07-15",
        }),
      }),
    ]);

    const { getByText, queryByText } = await renderWithQuery(
      <CatalogList onOpen={jest.fn()} />,
    );

    await waitFor(() => expect(getByText("Saturday workshop")).toBeTruthy());
    expect(queryByText("Finished")).toBeNull();
  });

  it("shows no dates on a whole-year activity", async () => {
    mockFetch.mockResolvedValue([makeCatalogActivity()]);

    const { getByText, queryByText } = await renderWithQuery(
      <CatalogList onOpen={jest.fn()} />,
    );

    await waitFor(() => expect(getByText("Saturday workshop")).toBeTruthy());
    // Dates always show the year
    expect(queryByText(/20\d\d/)).toBeNull();
  });

  it("shows the activity without a provider name when it has no contact details", async () => {
    mockFetch.mockResolvedValue([
      makeCatalogActivity({ provider: makeProvider({ contact: null }) }),
    ]);

    const { getByText, queryByText } = await renderWithQuery(
      <CatalogList onOpen={jest.fn()} />,
    );

    await waitFor(() => expect(getByText("Saturday workshop")).toBeTruthy());
    expect(queryByText("Sports Club")).toBeNull();
  });

  it("opens the activity that is pressed", async () => {
    const onOpen = jest.fn();
    mockFetch.mockResolvedValue([
      makeCatalogActivity({
        activity: makeActivity({ id: "a2", title: "Chess" }),
      }),
    ]);

    const { getByText } = await renderWithQuery(
      <CatalogList onOpen={onOpen} />,
    );
    await waitFor(() => expect(getByText("Chess")).toBeTruthy());

    await fireEvent.press(getByText("Chess"));

    expect(onOpen).toHaveBeenCalledWith("a2");
  });

  it("shows a message when there are no activities", async () => {
    mockFetch.mockResolvedValue([]);

    const { getByText } = await renderWithQuery(
      <CatalogList onOpen={jest.fn()} />,
    );

    await waitFor(() =>
      expect(getByText("There are no activities available yet.")).toBeTruthy(),
    );
  });

  it("shows an error message when the activities cannot be loaded", async () => {
    mockFetch.mockRejectedValue(new Error("boom"));

    const { getByText } = await renderWithQuery(
      <CatalogList onOpen={jest.fn()} />,
    );

    await waitFor(() =>
      expect(getByText("Activities could not be loaded.")).toBeTruthy(),
    );
  });

  it("loads the activities again on pull to refresh", async () => {
    mockFetch.mockResolvedValue([makeCatalogActivity()]);

    const { getByText, getByTestId } = await renderWithQuery(
      <CatalogList onOpen={jest.fn()} />,
    );
    await waitFor(() => expect(getByText("Saturday workshop")).toBeTruthy());

    await act(async () => {
      getByTestId("catalog-list").props.refreshControl.props.onRefresh();
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  describe("heart", () => {
    beforeEach(() => {
      mockAddFavourite.mockReset();
      jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("fills the heart at once and saves the activity", async () => {
      mockFetch.mockResolvedValue([makeCatalogActivity()]);
      // The request has not answered yet
      mockAddFavourite.mockReturnValue(new Promise(() => undefined));

      const { findByLabelText } = await renderWithQuery(
        <CatalogList onOpen={jest.fn()} />,
      );
      await fireEvent.press(
        await findByLabelText("Save Saturday workshop in favourites"),
      );

      expect(
        await findByLabelText("Remove Saturday workshop from favourites"),
      ).toBeTruthy();
      expect(mockAddFavourite).toHaveBeenCalledWith("a1");
    });

    it("does not open the activity when the heart is pressed", async () => {
      mockFetch.mockResolvedValue([makeCatalogActivity()]);
      mockAddFavourite.mockResolvedValue(undefined);
      const onOpen = jest.fn();

      const { findByLabelText } = await renderWithQuery(
        <CatalogList onOpen={onOpen} />,
      );
      await fireEvent.press(
        await findByLabelText("Save Saturday workshop in favourites"),
      );

      expect(onOpen).not.toHaveBeenCalled();
    });

    it("empties the heart again and explains why when saving fails", async () => {
      mockFetch.mockResolvedValue([makeCatalogActivity()]);
      mockAddFavourite.mockRejectedValue(
        new Error(
          'new row violates row-level security policy for table "favourites"',
        ),
      );

      const { findByLabelText } = await renderWithQuery(
        <CatalogList onOpen={jest.fn()} />,
      );
      await fireEvent.press(
        await findByLabelText("Save Saturday workshop in favourites"),
      );

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith(
          "Favourites",
          "This activity can no longer be saved.",
        ),
      );
      expect(
        await findByLabelText("Save Saturday workshop in favourites"),
      ).toBeTruthy();
    });
  });
});
