import { waitFor } from "@testing-library/react-native";

import { formatAgeRange, formatDateRange, formatPrice } from "../format";
import {
  makeActivity,
  makeCatalogActivity,
  makeProvider,
  renderWithQuery,
} from "../testFixtures";
import { type CatalogActivityDetail as Detail } from "../types";
import { CatalogActivityDetail } from "./CatalogActivityDetail";

const mockFetch = jest.fn();

jest.mock("../api/fetchCatalogActivity", () => ({
  fetchCatalogActivity: (id: string) => mockFetch(id),
}));

function makeDetail(overrides: Partial<Detail> = {}): Detail {
  return { ...makeCatalogActivity(), address: "Main Street 1, Lleida", ...overrides };
}

describe("CatalogActivityDetail", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("shows all the fields of the activity and the provider profile", async () => {
    const detail = makeDetail();
    mockFetch.mockResolvedValue(detail);

    const { getByText } = await renderWithQuery(<CatalogActivityDetail id="a1" />);

    await waitFor(() => expect(getByText("Saturday workshop")).toBeTruthy());
    expect(mockFetch).toHaveBeenCalledWith("a1");
    expect(getByText("Fun for everyone")).toBeTruthy();
    expect(getByText(formatAgeRange(7, 12))).toBeTruthy();
    expect(getByText("Monday 17:00-18:00")).toBeTruthy();
    expect(getByText(formatPrice(15))).toBeTruthy();
    expect(getByText(formatDateRange("2026-10-01", "2026-12-31") as string)).toBeTruthy();
    expect(getByText("Main Street 1, Lleida")).toBeTruthy();
    expect(getByText("Sports Club")).toBeTruthy();
    expect(getByText(detail.provider.headline)).toBeTruthy();
    expect(getByText(detail.provider.description)).toBeTruthy();
    expect(getByText("club@example.com")).toBeTruthy();
    expect(getByText("600000000")).toBeTruthy();
    expect(getByText("https://club.example.com")).toBeTruthy();
  });

  it("leaves out the parts that are not available", async () => {
    mockFetch.mockResolvedValue(
      makeDetail({
        activity: makeActivity({
          description: null,
          schedule: [],
          startDate: null,
          endDate: null,
        }),
        address: null,
        provider: makeProvider({
          contact: {
            name: "Sports Club",
            email: null,
            phoneNumber: null,
            website: null,
          },
        }),
      }),
    );

    const { getByText, queryByText } = await renderWithQuery(
      <CatalogActivityDetail id="a1" />,
    );

    await waitFor(() => expect(getByText("Sports Club")).toBeTruthy());
    expect(queryByText("Fun for everyone")).toBeNull();
    expect(queryByText("Schedule")).toBeNull();
    expect(queryByText("Dates")).toBeNull();
    expect(queryByText("Address")).toBeNull();
    expect(queryByText("Email")).toBeNull();
    expect(queryByText("Phone")).toBeNull();
    expect(queryByText("Website")).toBeNull();
  });

  it("shows the approved profile when the provider has no contact details", async () => {
    const provider = makeProvider({ contact: null });
    mockFetch.mockResolvedValue(makeDetail({ provider }));

    const { getByText, queryByText } = await renderWithQuery(
      <CatalogActivityDetail id="a1" />,
    );

    await waitFor(() => expect(getByText(provider.headline)).toBeTruthy());
    expect(getByText(provider.description)).toBeTruthy();
    expect(queryByText("Sports Club")).toBeNull();
    expect(queryByText("Email")).toBeNull();
  });

  it("says so when the activity does not exist anymore", async () => {
    mockFetch.mockResolvedValue(null);

    const { getByText } = await renderWithQuery(<CatalogActivityDetail id="a1" />);

    await waitFor(() =>
      expect(getByText("This activity is no longer available.")).toBeTruthy(),
    );
  });

  it("shows an error message when the activity cannot be loaded", async () => {
    mockFetch.mockRejectedValue(new Error("boom"));

    const { getByText } = await renderWithQuery(<CatalogActivityDetail id="a1" />);

    await waitFor(() =>
      expect(getByText("The activity could not be loaded.")).toBeTruthy(),
    );
  });
});