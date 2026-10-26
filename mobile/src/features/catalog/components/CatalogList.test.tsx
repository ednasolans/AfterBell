import { act, fireEvent, waitFor } from "@testing-library/react-native";

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
    expect(getByText("Ages: 7-9, 10-12")).toBeTruthy();
    expect(getByText("15 € per month")).toBeTruthy();
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
});
