import { render, screen, waitFor } from "@testing-library/react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { fetchSearchSummary } from "../api/fetchSearchSummary";
import { type SearchSummaryFilters } from "../types";
import { SearchSummary } from "./SearchSummary";

jest.mock("../api/fetchSearchSummary", () => ({
  fetchSearchSummary: jest.fn(),
}));

const FILTERS: SearchSummaryFilters = {
  query: "swimming",
  category: null,
  city: "Lleida",
  priceMin: null,
  priceMax: null,
};

async function renderSummary(enabled = true) {
  await render(<SearchSummary filters={FILTERS} enabled={enabled} />, {
    wrapper: createQueryClientWrapper(createTestQueryClient()),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SearchSummary", () => {
  it("shows a placeholder while the summary is written", async () => {
    jest.mocked(fetchSearchSummary).mockReturnValue(new Promise(() => {}));
    await renderSummary();
    expect(
      screen.getByLabelText("Writing an AI summary of the results"),
    ).toBeTruthy();
  });

  it("shows the summary with the AI label", async () => {
    jest.mocked(fetchSearchSummary).mockResolvedValue({
      status: "READY",
      summary: "Two swimming activities.",
    });
    await renderSummary();
    expect(await screen.findByText("Two swimming activities.")).toBeTruthy();
    expect(screen.getByText("AI summary")).toBeTruthy();
    expect(
      screen.getByText(
        "Written by AI from these results. Check the details of each activity.",
      ),
    ).toBeTruthy();
  });

  it.each(["NO_RESULTS", "UNAVAILABLE", "RATE_LIMITED"] as const)(
    "hides the block when the status is %s",
    async (status) => {
      jest.mocked(fetchSearchSummary).mockResolvedValue({ status });
      await renderSummary();
      await waitForHidden();
    },
  );

  it("hides the block when the request fails", async () => {
    jest
      .mocked(fetchSearchSummary)
      .mockRejectedValue(new Error("Network error"));
    await renderSummary();
    await waitForHidden();
  });

  it("shows nothing and asks nothing while there are no results", async () => {
    await renderSummary(false);
    expect(screen.queryByText("AI summary")).toBeNull();
    expect(fetchSearchSummary).not.toHaveBeenCalled();
  });
});

async function waitForHidden() {
  await waitFor(() => expect(screen.queryByText("AI summary")).toBeNull());
}
