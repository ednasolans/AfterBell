import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { recommendationKeys } from "@/lib/recommendationKeys";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";
import {
  makePage,
  makeRecommendation,
  makeRecommendationActions,
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

async function renderSection(
  client = createTestQueryClient(),
  profileReady = true,
) {
  const onOpen = jest.fn();
  const onSeeAll = jest.fn();
  const actions = makeRecommendationActions();
  await render(
    <RecommendationsSection
      profileId="profile-2"
      profileReady={profileReady}
      onOpen={onOpen}
      onSeeAll={onSeeAll}
      actions={actions}
    />,
    {
      wrapper: createQueryClientWrapper(client),
    },
  );
  return { onOpen, onSeeAll, actions, client };
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

  it("waits for the active profile before asking", async () => {
    await renderSection(createTestQueryClient(), false);

    expect(screen.getByLabelText("Loading recommendations")).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks in the order of the active profile", async () => {
    fetchMock.mockResolvedValue(makePage());
    await renderSection();

    expect(await screen.findByText("Swimming for kids")).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledWith(0, "profile-2");
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
    ["NO_CITY", "Set your town", "setTown"],
    ["NO_PROFILES", "Add a profile", "addProfile"],
    ["INCOMPLETE_PROFILES", "Add interests", "completeProfile"],
    ["NO_MATCHES", "Search activities", "searchActivities"],
  ] as const)(
    "%s: says why under the title and leads to the right place",
    async (status, button, action) => {
      fetchMock.mockResolvedValue(makePage({ status, recommendations: [] }));
      const { actions } = await renderSection();

      const actionButton = await screen.findByRole("button", { name: button });
      expect(
        screen.getByRole("header", { name: "Recommended for you" }),
      ).toBeOnTheScreen();
      expect(
        screen.queryByRole("button", { name: "See all recommendations" }),
      ).not.toBeOnTheScreen();
      await fireEvent.press(actionButton);
      expect(actions[action]).toHaveBeenCalledTimes(1);
    },
  );

  it("shows the recommendations once the missing data is completed", async () => {
    fetchMock
      .mockResolvedValueOnce(
        makePage({ status: "NO_PROFILES", recommendations: [] }),
      )
      .mockResolvedValueOnce(makePage());
    const { client } = await renderSection();
    expect(
      await screen.findByRole("button", { name: "Add a profile" }),
    ).toBeOnTheScreen();

    // What saving a family profile or the town does on success
    await act(() =>
      client.invalidateQueries({ queryKey: recommendationKeys.all }),
    );

    expect(await screen.findByText("Swimming for kids")).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Add a profile" }),
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
    expect(fetchMock).toHaveBeenLastCalledWith(1, "profile-2");
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
