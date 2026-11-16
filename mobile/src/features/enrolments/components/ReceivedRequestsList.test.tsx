import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";

import { formatDate } from "@/lib/dates";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { answerEnrolmentRequest } from "../api/answerEnrolmentRequest";
import { fetchActivityPlaces } from "../api/fetchActivityPlaces";
import { fetchReceivedEnrolmentRequests } from "../api/fetchReceivedEnrolmentRequests";
import { type ActivityPlaces, type ReceivedEnrolmentRequest } from "../types";
import { ReceivedRequestsList } from "./ReceivedRequestsList";

jest.mock("expo-router", () => ({ useFocusEffect: jest.fn() }));
jest.mock("../api/fetchReceivedEnrolmentRequests", () => ({
  fetchReceivedEnrolmentRequests: jest.fn(),
}));
jest.mock("../api/fetchActivityPlaces", () => ({
  fetchActivityPlaces: jest.fn(),
}));
jest.mock("../api/answerEnrolmentRequest", () => ({
  answerEnrolmentRequest: jest.fn(),
}));

const PENDING: ReceivedEnrolmentRequest = {
  id: "r1",
  activityId: "a1",
  activityTitle: "Swimming",
  familyProfileName: "Anna",
  familyProfileAge: 8,
  familyProfileAgeRange: "7-9",
  customerEmail: "family@test.com",
  message: "She loves water",
  status: "pending",
  createdAt: "2027-07-01T10:00:00Z",
};

const ACCEPTED: ReceivedEnrolmentRequest = {
  ...PENDING,
  id: "r2",
  familyProfileName: "Pau",
  familyProfileAge: null,
  message: null,
  status: "accepted",
};

const SWIMMING: ActivityPlaces = {
  activityId: "a1",
  activityTitle: "Swimming",
  maxParticipants: 12,
  takenPlaces: 8,
  availablePlaces: 4,
};

const CHESS: ActivityPlaces = {
  activityId: "a2",
  activityTitle: "Chess",
  maxParticipants: 2,
  takenPlaces: 2,
  availablePlaces: 0,
};

async function renderList(initialActivityId: string | null = null) {
  await render(<ReceivedRequestsList initialActivityId={initialActivityId} />, {
    wrapper: createQueryClientWrapper(createTestQueryClient()),
  });
}

// Presses one of the buttons of the confirmation dialog shown with Alert.alert
function pressAlertButton(text: string) {
  const buttons = jest.mocked(Alert.alert).mock.calls[0][2] as AlertButton[];
  buttons.find((button) => button.text === text)?.onPress?.();
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  jest
    .mocked(fetchReceivedEnrolmentRequests)
    .mockResolvedValue([PENDING, ACCEPTED]);
  jest.mocked(fetchActivityPlaces).mockResolvedValue([SWIMMING, CHESS]);
});

describe("ReceivedRequestsList", () => {
  it("shows each request with its profile, age, activity, places, email, date and message", async () => {
    await renderList();

    expect(await screen.findByText("Anna · 8 years old")).toBeOnTheScreen();
    expect(await screen.findAllByText("Swimming · 8 / 12")).toHaveLength(2);
    expect(screen.getAllByText("family@test.com")).toHaveLength(2);
    expect(
      screen.getAllByText(`Received on ${formatDate("2027-07-01")}`),
    ).toHaveLength(2);
    expect(screen.getByText("She loves water")).toBeOnTheScreen();
    // Without a date of birth, the age range
    expect(screen.getByText("Pau · Age 7-9")).toBeOnTheScreen();
  });

  it("only offers accept and reject for pending requests", async () => {
    await renderList();

    expect(
      await screen.findByRole("button", {
        name: "Accept the request of Anna for Swimming",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", {
        name: "Accept the request of Pau for Swimming",
      }),
    ).toBeNull();
  });

  it("asks for every request at first, and filters by status", async () => {
    await renderList();
    await screen.findByText("Anna · 8 years old");
    expect(fetchReceivedEnrolmentRequests).toHaveBeenCalledWith({
      activityId: null,
      status: null,
    });

    await fireEvent.press(screen.getByRole("button", { name: "Accepted" }));

    await waitFor(() =>
      expect(fetchReceivedEnrolmentRequests).toHaveBeenLastCalledWith({
        activityId: null,
        status: "accepted",
      }),
    );
  });

  it("filters by activity and shows its places", async () => {
    await renderList();
    await fireEvent.press(await screen.findByRole("button", { name: "Chess" }));

    await waitFor(() =>
      expect(fetchReceivedEnrolmentRequests).toHaveBeenLastCalledWith({
        activityId: "a2",
        status: null,
      }),
    );
    expect(
      await screen.findByText("Places taken: 2 / 2 · Full"),
    ).toBeOnTheScreen();
  });

  it("opens filtered by the activity it was opened from", async () => {
    await renderList("a1");

    expect(await screen.findByText("Places taken: 8 / 12")).toBeOnTheScreen();
    expect(fetchReceivedEnrolmentRequests).toHaveBeenCalledWith({
      activityId: "a1",
      status: null,
    });
  });

  it("accepts a request after confirming and updates the counter at once", async () => {
    jest.mocked(answerEnrolmentRequest).mockResolvedValue();
    await renderList();
    const accept = await screen.findByRole("button", {
      name: "Accept the request of Anna for Swimming",
    });
    await screen.findAllByText("Swimming · 8 / 12");
    // The reload after answering never ends: what changes comes from the cache
    jest
      .mocked(fetchActivityPlaces)
      .mockReturnValue(new Promise(() => undefined));
    jest
      .mocked(fetchReceivedEnrolmentRequests)
      .mockReturnValue(new Promise(() => undefined));

    await fireEvent.press(accept);
    expect(answerEnrolmentRequest).not.toHaveBeenCalled();
    pressAlertButton("Accept");

    await waitFor(() =>
      expect(answerEnrolmentRequest).toHaveBeenCalledWith({
        requestId: "r1",
        answer: "accept",
      }),
    );
    expect(await screen.findAllByText("Swimming · 9 / 12")).toHaveLength(2);
    expect(
      screen.queryByRole("button", {
        name: "Accept the request of Anna for Swimming",
      }),
    ).toBeNull();
  });

  it("rejects a request after confirming", async () => {
    jest.mocked(answerEnrolmentRequest).mockResolvedValue();
    await renderList();

    await fireEvent.press(
      await screen.findByRole("button", {
        name: "Reject the request of Anna for Swimming",
      }),
    );
    pressAlertButton("Reject");

    await waitFor(() =>
      expect(answerEnrolmentRequest).toHaveBeenCalledWith({
        requestId: "r1",
        answer: "reject",
      }),
    );
  });

  it("does not accept requests for a full activity, and says why", async () => {
    jest
      .mocked(fetchReceivedEnrolmentRequests)
      .mockResolvedValue([
        { ...PENDING, activityId: "a2", activityTitle: "Chess" },
      ]);
    await renderList();

    const accept = await screen.findByRole("button", {
      name: "Accept the request of Anna for Chess",
    });
    await waitFor(() => expect(accept).toBeDisabled());
    expect(
      screen.getByText(
        "This activity is full: you cannot accept more requests.",
      ),
    ).toBeOnTheScreen();
    // It can still be rejected
    expect(
      screen.getByRole("button", {
        name: "Reject the request of Anna for Chess",
      }),
    ).toBeEnabled();
  });

  it("shows the message of the server when the last place was just taken", async () => {
    jest
      .mocked(answerEnrolmentRequest)
      .mockRejectedValue(
        new Error("There are no places left in this activity"),
      );
    await renderList();

    await fireEvent.press(
      await screen.findByRole("button", {
        name: "Accept the request of Anna for Swimming",
      }),
    );
    pressAlertButton("Accept");

    expect(
      await screen.findByText("There are no places left in this activity"),
    ).toBeOnTheScreen();
  });

  it("hides technical errors when answering fails", async () => {
    jest
      .mocked(answerEnrolmentRequest)
      .mockRejectedValue(new Error("Network request failed"));
    await renderList();

    await fireEvent.press(
      await screen.findByRole("button", {
        name: "Reject the request of Anna for Swimming",
      }),
    );
    pressAlertButton("Reject");

    expect(
      await screen.findByText(
        "The request could not be answered. Please try again.",
      ),
    ).toBeOnTheScreen();
  });

  it("says when there are no requests yet", async () => {
    jest.mocked(fetchReceivedEnrolmentRequests).mockResolvedValue([]);
    await renderList();

    expect(
      await screen.findByText("You have not received any requests yet."),
    ).toBeOnTheScreen();
  });

  it("says when no request matches the filters", async () => {
    jest.mocked(fetchReceivedEnrolmentRequests).mockResolvedValue([]);
    await renderList("a1");

    expect(
      await screen.findByText("No requests match these filters."),
    ).toBeOnTheScreen();
  });

  it("shows an error and tries again", async () => {
    jest
      .mocked(fetchReceivedEnrolmentRequests)
      .mockRejectedValueOnce(new Error("boom"));
    await renderList();

    expect(
      await screen.findByText("The requests could not be loaded."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Anna · 8 years old")).toBeOnTheScreen();
  });
});
