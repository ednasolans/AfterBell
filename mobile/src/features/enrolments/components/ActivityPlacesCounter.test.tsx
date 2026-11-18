import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { fetchActivityPlaces } from "../api/fetchActivityPlaces";
import { ActivityPlacesCounter } from "./ActivityPlacesCounter";

jest.mock("../api/fetchActivityPlaces", () => ({
  fetchActivityPlaces: jest.fn(),
}));

async function renderCounter(activityId = "a1", onPress = jest.fn()) {
  await render(
    <ActivityPlacesCounter activityId={activityId} onPress={onPress} />,
    { wrapper: createQueryClientWrapper(createTestQueryClient()) },
  );
  return onPress;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchActivityPlaces).mockResolvedValue([
    {
      activityId: "a1",
      activityTitle: "Swimming",
      maxParticipants: 12,
      takenPlaces: 8,
      availablePlaces: 4,
    },
    {
      activityId: "a2",
      activityTitle: "Chess",
      maxParticipants: 2,
      takenPlaces: 2,
      availablePlaces: 0,
    },
    {
      activityId: "a3",
      activityTitle: "Drawing",
      maxParticipants: null,
      takenPlaces: 3,
      availablePlaces: null,
    },
  ]);
});

describe("ActivityPlacesCounter", () => {
  it("shows the places taken against the maximum and opens the requests", async () => {
    const onPress = await renderCounter();

    expect(await screen.findByText("Places: 8 / 12")).toBeOnTheScreen();
    expect(screen.queryByText("Full")).toBeNull();
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalled();
  });

  it("marks a full activity", async () => {
    await renderCounter("a2");

    expect(await screen.findByText("Places: 2 / 2")).toBeOnTheScreen();
    expect(screen.getByText("Full")).toBeOnTheScreen();
  });

  it("shows an activity without limit", async () => {
    await renderCounter("a3");

    expect(await screen.findByText("Places: 3 (no limit)")).toBeOnTheScreen();
  });

  it("shows nothing when the places cannot be read", async () => {
    jest.mocked(fetchActivityPlaces).mockRejectedValue(new Error("boom"));
    await renderCounter();

    expect(screen.queryByText(/Places/)).toBeNull();
  });
});
