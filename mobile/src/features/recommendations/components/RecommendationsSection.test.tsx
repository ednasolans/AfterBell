import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import { recommendationKeys } from "@/lib/recommendationKeys";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";
import {
  makePage,
  makeRecommendation,
} from "@/test-utils/recommendationFixtures";
import { ACTIVITY } from "@/test-utils/activityFixtures";

import { fetchRecommendations } from "../api/fetchRecommendations";
import { RecommendationsSection } from "./RecommendationsSection";

jest.mock("../api/fetchRecommendations", () => ({
  fetchRecommendations: jest.fn(),
}));

const fetchMock = jest.mocked(fetchRecommendations);

const SECOND = makeRecommendation({
  activity: { ...ACTIVITY, id: "activity-2", title: "Chess club" },
  matchedProfiles: [
    { id: "profile-1", firstName: "Marc" },
    { id: "profile-2", firstName: "Laia" },
  ],
});

async function renderSection(client = createTestQueryClient()) {
  const onOpen = jest.fn();
  const onSeeAll = jest.fn();
  await render(<RecommendationsSection onOpen={onOpen} onSeeAll={onSeeAll} />, {
    wrapper: createQueryClientWrapper(client),
  });
  return { onOpen, onSeeAll, client };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe("RecommendationsSection", () => {
  it("shows a spinner under the title while it loads", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    await renderSection();

    expect(
      screen.getByRole("header", { name: "Recommended for you" }),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Loading recommendations")).toBeOnTheScreen();
  });

  it("shows the recommendations with the profiles they fit", async () => {
    fetchMock.mockResolvedValue(
      makePage({ recommendations: [makeRecommendation(), SECOND] }),
    );
    await renderSection();

    expect(await screen.findByText("Swimming for kids")).toBeOnTheScreen();
    expect(screen.getByText("Suitable for Marc")).toBeOnTheScreen();
    expect(screen.getByText("Chess club")).toBeOnTheScreen();
    expect(screen.getByText("Suitable for Marc, Laia")).toBeOnTheScreen();
    expect(screen.getAllByText("Pool club")).toHaveLength(2);
  });

  it("opens the detail of a recommendation", async () => {
    fetchMock.mockResolvedValue(makePage());
    const { onOpen } = await renderSection();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Open Swimming for kids" }),
    );
    expect(onOpen).toHaveBeenCalledWith("activity-1");
  });

  it("opens every recommendation", async () => {
    fetchMock.mockResolvedValue(makePage());
    const { onSeeAll } = await renderSection();

    await fireEvent.press(
      await screen.findByRole("button", { name: "See all recommendations" }),
    );
    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  it("shows an error and loads again when asked", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    fetchMock.mockResolvedValueOnce(makePage());
    await renderSection();

    expect(
      await screen.findByText("Your recommendations could not be loaded."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Swimming for kids")).toBeOnTheScreen();
  });

  it.each([
    "NO_CITY",
    "NO_PROFILES",
    "INCOMPLETE_PROFILES",
    "NO_MATCHES",
  ] as const)("shows nothing when the status is %s", async (status) => {
    fetchMock.mockResolvedValue(makePage({ status, recommendations: [] }));
    await renderSection();

    await waitFor(() =>
      expect(
        screen.queryByLabelText("Loading recommendations"),
      ).not.toBeOnTheScreen(),
    );
    expect(
      screen.queryByRole("header", { name: "Recommended for you" }),
    ).not.toBeOnTheScreen();
  });

  it("loads the next page at the end of the row", async () => {
    fetchMock
      .mockResolvedValueOnce(makePage({ hasMore: true }))
      .mockResolvedValueOnce(makePage({ recommendations: [SECOND] }));
    await renderSection();

    await fireEvent(
      await screen.findByTestId("recommendations-row"),
      "endReached",
    );
    expect(await screen.findByText("Chess club")).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenLastCalledWith(1);
  });

  it("does not ask for more when there are no more pages", async () => {
    fetchMock.mockResolvedValue(makePage({ hasMore: false }));
    await renderSection();

    await fireEvent(
      await screen.findByTestId("recommendations-row"),
      "endReached",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("offers to try again when the next page fails", async () => {
    fetchMock
      .mockResolvedValueOnce(makePage({ hasMore: true }))
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(makePage({ recommendations: [SECOND] }));
    await renderSection();

    await fireEvent(
      await screen.findByTestId("recommendations-row"),
      "endReached",
    );
    expect(
      await screen.findByText("More recommendations could not be loaded."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Chess club")).toBeOnTheScreen();
  });

  it("shows the new recommendations when the family data changes", async () => {
    fetchMock
      .mockResolvedValueOnce(makePage())
      .mockResolvedValueOnce(makePage({ recommendations: [SECOND] }));
    const { client } = await renderSection();
    expect(await screen.findByText("Swimming for kids")).toBeOnTheScreen();

    // What the family profile and town mutations do on success
    await act(() =>
      client.invalidateQueries({ queryKey: recommendationKeys.all }),
    );

    expect(await screen.findByText("Chess club")).toBeOnTheScreen();
    expect(screen.queryByText("Swimming for kids")).not.toBeOnTheScreen();
  });
});
