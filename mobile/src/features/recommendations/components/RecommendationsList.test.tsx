import { fireEvent, render, screen } from "@testing-library/react-native";

import { ACTIVITY } from "@/test-utils/activityFixtures";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";
import {
  makePage,
  makeRecommendation,
} from "@/test-utils/recommendationFixtures";

import { fetchRecommendations } from "../api/fetchRecommendations";
import { RecommendationsList } from "./RecommendationsList";

jest.mock("../api/fetchRecommendations", () => ({
  fetchRecommendations: jest.fn(),
}));

const fetchMock = jest.mocked(fetchRecommendations);

async function renderList() {
  const onOpen = jest.fn();
  await render(<RecommendationsList onOpen={onOpen} />, {
    wrapper: createQueryClientWrapper(createTestQueryClient()),
  });
  return { onOpen };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe("RecommendationsList", () => {
  it("shows a spinner while it loads", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    await renderList();

    expect(screen.getByLabelText("Loading")).toBeOnTheScreen();
  });

  it("shows an error and loads again when asked", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    fetchMock.mockResolvedValueOnce(makePage());
    await renderList();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Try again" }),
    );
    expect(await screen.findByText("Swimming for kids")).toBeOnTheScreen();
  });

  it("shows a message when there are no recommendations", async () => {
    fetchMock.mockResolvedValue(
      makePage({ status: "NO_MATCHES", recommendations: [] }),
    );
    await renderList();

    expect(
      await screen.findByText("There are no recommendations yet."),
    ).toBeOnTheScreen();
  });

  it("shows the profiles each activity fits and opens it", async () => {
    fetchMock.mockResolvedValue(makePage());
    const { onOpen } = await renderList();

    expect(await screen.findByText("Suitable for Marc")).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole("button", { name: "Open Swimming for kids" }),
    );
    expect(onOpen).toHaveBeenCalledWith("activity-1");
  });

  it("loads the next page at the end of the list", async () => {
    fetchMock
      .mockResolvedValueOnce(makePage({ hasMore: true }))
      .mockResolvedValueOnce(
        makePage({
          recommendations: [
            makeRecommendation({
              activity: { ...ACTIVITY, id: "activity-2", title: "Chess club" },
            }),
          ],
        }),
      );
    await renderList();

    await fireEvent(
      await screen.findByTestId("recommendations-list"),
      "endReached",
    );
    expect(await screen.findByText("Chess club")).toBeOnTheScreen();
    expect(screen.getByText("Swimming for kids")).toBeOnTheScreen();
  });

  it("loads the recommendations again when the list is pulled", async () => {
    fetchMock.mockResolvedValue(makePage());
    await renderList();

    const list = await screen.findByTestId("recommendations-list");
    await fireEvent(list, "refresh");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
