import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Alert } from "react-native";

import { formatDate } from "@/lib/dates";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { cancelEnrolmentRequest } from "../api/cancelEnrolmentRequest";
import { fetchMyEnrolmentRequests } from "../api/fetchMyEnrolmentRequests";
import { type EnrolmentRequest } from "../types";
import { MyEnrolmentRequestsList } from "./MyEnrolmentRequestsList";

const mockFocusEffect = jest.fn();

jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void) => mockFocusEffect(effect),
}));
jest.mock("../api/fetchMyEnrolmentRequests", () => ({
  fetchMyEnrolmentRequests: jest.fn(),
}));
jest.mock("../api/cancelEnrolmentRequest", () => ({
  cancelEnrolmentRequest: jest.fn(),
}));

const REQUEST: EnrolmentRequest = {
  id: "r1",
  activityId: "a1",
  activityTitle: "Swimming",
  activityAvailable: true,
  familyProfileId: "anna",
  familyProfileName: "Anna",
  message: "Hello",
  status: "pending",
  createdAt: "2027-07-01T10:00:00Z",
};

async function renderList(onExplore = jest.fn()) {
  await render(<MyEnrolmentRequestsList onExplore={onExplore} />, {
    wrapper: createQueryClientWrapper(createTestQueryClient()),
  });
  return onExplore;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("MyEnrolmentRequestsList", () => {
  it("shows each request with its activity, profile, date and status", async () => {
    jest
      .mocked(fetchMyEnrolmentRequests)
      .mockResolvedValue([
        REQUEST,
        { ...REQUEST, id: "r2", familyProfileName: "Pau", status: "rejected" },
      ]);
    await renderList();

    expect(await screen.findByText("For Anna")).toBeOnTheScreen();
    expect(screen.getAllByText("Swimming")).toHaveLength(2);
    expect(
      screen.getAllByText(`Sent on ${formatDate("2027-07-01")}`),
    ).toHaveLength(2);
    expect(screen.getByText("Pending")).toBeOnTheScreen();
    expect(screen.getByText("Rejected")).toBeOnTheScreen();
    expect(screen.getAllByText("Hello")).toHaveLength(2);
  });

  it("only lets cancel active requests", async () => {
    jest
      .mocked(fetchMyEnrolmentRequests)
      .mockResolvedValue([
        REQUEST,
        { ...REQUEST, id: "r2", familyProfileName: "Pau", status: "cancelled" },
      ]);
    await renderList();

    expect(
      await screen.findByRole("button", {
        name: "Cancel the request of Anna for Swimming",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", {
        name: "Cancel the request of Pau for Swimming",
      }),
    ).toBeNull();
  });

  it("cancels a request after confirming it", async () => {
    jest.mocked(fetchMyEnrolmentRequests).mockResolvedValue([REQUEST]);
    jest.mocked(cancelEnrolmentRequest).mockResolvedValue();
    const alert = jest.spyOn(Alert, "alert");
    await renderList();

    await fireEvent.press(
      await screen.findByRole("button", {
        name: "Cancel the request of Anna for Swimming",
      }),
    );
    const buttons = alert.mock.calls[0][2] ?? [];
    await act(async () => {
      buttons.find((button) => button.style === "destructive")?.onPress?.();
    });

    await waitFor(() =>
      expect(cancelEnrolmentRequest).toHaveBeenCalledWith(
        "r1",
        expect.anything(),
      ),
    );
  });

  it("does not cancel when the family keeps the request", async () => {
    jest.mocked(fetchMyEnrolmentRequests).mockResolvedValue([REQUEST]);
    const alert = jest.spyOn(Alert, "alert");
    await renderList();

    await fireEvent.press(
      await screen.findByRole("button", {
        name: "Cancel the request of Anna for Swimming",
      }),
    );
    const buttons = alert.mock.calls[0][2] ?? [];
    await act(async () => {
      buttons.find((button) => button.style === "cancel")?.onPress?.();
    });

    expect(cancelEnrolmentRequest).not.toHaveBeenCalled();
  });

  it("shows why a cancellation failed", async () => {
    jest.mocked(fetchMyEnrolmentRequests).mockResolvedValue([REQUEST]);
    jest
      .mocked(cancelEnrolmentRequest)
      .mockRejectedValue(new Error("Network request failed"));
    const alert = jest.spyOn(Alert, "alert");
    await renderList();

    await fireEvent.press(
      await screen.findByRole("button", {
        name: "Cancel the request of Anna for Swimming",
      }),
    );
    const buttons = alert.mock.calls[0][2] ?? [];
    await act(async () => {
      buttons.find((button) => button.style === "destructive")?.onPress?.();
    });

    expect(
      await screen.findByText(
        "The request could not be cancelled. Please try again.",
      ),
    ).toBeOnTheScreen();
  });

  it("marks the activities that are no longer available", async () => {
    jest
      .mocked(fetchMyEnrolmentRequests)
      .mockResolvedValue([{ ...REQUEST, activityAvailable: false }]);
    await renderList();

    expect(await screen.findByText("No longer available")).toBeOnTheScreen();
  });

  it("shows an empty state with a link to the activities", async () => {
    jest.mocked(fetchMyEnrolmentRequests).mockResolvedValue([]);
    const onExplore = await renderList();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Explore activities" }),
    );

    expect(
      screen.getByText("You have not sent any requests yet."),
    ).toBeOnTheScreen();
    expect(onExplore).toHaveBeenCalled();
  });

  it("shows an error with a retry", async () => {
    jest
      .mocked(fetchMyEnrolmentRequests)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue([REQUEST]);
    await renderList();

    expect(
      await screen.findByText("Your requests could not be loaded."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: /retry|again/i }));

    expect(await screen.findByText("For Anna")).toBeOnTheScreen();
  });

  it("loads the requests again when the family comes back to the screen", async () => {
    jest.mocked(fetchMyEnrolmentRequests).mockResolvedValue([REQUEST]);
    await renderList();
    await screen.findByText("For Anna");

    const effect = mockFocusEffect.mock.lastCall?.[0] as () => void;
    await act(async () => {
      effect(); // first focus: the query has just loaded
      effect(); // the family comes back
    });

    await waitFor(() =>
      expect(fetchMyEnrolmentRequests).toHaveBeenCalledTimes(2),
    );
  });
});
