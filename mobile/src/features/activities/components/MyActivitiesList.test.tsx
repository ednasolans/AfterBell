import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Alert, type AlertButton, Text } from "react-native";

import { formatDate } from "@/lib/dates";

import { ACTIVITY } from "@/test-utils/activityFixtures";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { deleteActivity } from "../api/deleteActivity";
import { fetchMyAddresses } from "../api/fetchMyAddresses";
import { fetchMyActivities } from "../api/fetchMyActivities";
import { MyActivitiesList } from "./MyActivitiesList";

jest.mock("../api/fetchMyActivities", () => ({ fetchMyActivities: jest.fn() }));
jest.mock("../api/deleteActivity", () => ({ deleteActivity: jest.fn() }));
jest.mock("../api/fetchMyAddresses", () => ({ fetchMyAddresses: jest.fn() }));

async function renderList(onEdit = jest.fn(), onCreate = jest.fn()) {
  await render(<MyActivitiesList onCreate={onCreate} onEdit={onEdit} />, {
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
    .mocked(fetchMyAddresses)
    .mockResolvedValue([
      { id: "address-1", address: "C/ Major 1", city: "Lleida" },
    ]);
});

describe("MyActivitiesList", () => {
  it("shows the activities of the provider", async () => {
    jest.mocked(fetchMyActivities).mockResolvedValue([ACTIVITY]);
    await renderList();

    expect(await screen.findByText("Swimming for kids")).toBeOnTheScreen();
    expect(await screen.findByText("C/ Major 1, Lleida")).toBeOnTheScreen();
  });

  it("shows the activities without their address if the addresses fail to load", async () => {
    jest.mocked(fetchMyActivities).mockResolvedValue([ACTIVITY]);
    jest.mocked(fetchMyAddresses).mockRejectedValue(new Error("Network error"));
    await renderList();

    expect(await screen.findByText("Swimming for kids")).toBeOnTheScreen();
    expect(screen.queryByText("C/ Major 1, Lleida")).not.toBeOnTheScreen();
  });

  it("shows a message when there are no activities, and can create one", async () => {
    jest.mocked(fetchMyActivities).mockResolvedValue([]);
    const onCreate = jest.fn();
    await renderList(jest.fn(), onCreate);

    expect(
      await screen.findByText(
        "You have no activities yet. Create your first one!",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "New activity" }));
    expect(onCreate).toHaveBeenCalled();
  });

  it("shows an error when loading fails and tries again", async () => {
    jest
      .mocked(fetchMyActivities)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce([ACTIVITY]);
    await renderList();

    expect(
      await screen.findByText("Your activities could not be loaded."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Swimming for kids")).toBeOnTheScreen();
  });

  it("opens the activity to edit it", async () => {
    jest.mocked(fetchMyActivities).mockResolvedValue([ACTIVITY]);
    const onEdit = jest.fn();
    await renderList(onEdit);

    await fireEvent.press(
      await screen.findByRole("button", { name: "Edit Swimming for kids" }),
    );

    expect(onEdit).toHaveBeenCalledWith("activity-1");
  });

  it("deletes the activity after the provider confirms it", async () => {
    jest.mocked(fetchMyActivities).mockResolvedValue([ACTIVITY]);
    jest.mocked(deleteActivity).mockResolvedValue(undefined);
    await renderList();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Delete Swimming for kids" }),
    );
    pressAlertButton("Delete");

    await waitFor(() =>
      expect(deleteActivity).toHaveBeenCalledWith(
        "activity-1",
        expect.anything(),
      ),
    );
  });

  it("disables the delete button of the activity being deleted", async () => {
    jest.mocked(fetchMyActivities).mockResolvedValue([ACTIVITY]);
    // A request that never finishes, to see the "deleting" state
    jest.mocked(deleteActivity).mockReturnValue(new Promise(() => {}));
    await renderList();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Delete Swimming for kids" }),
    );
    pressAlertButton("Delete");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Delete Swimming for kids" }),
      ).toBeDisabled(),
    );
  });

  it("does not delete the activity when the provider cancels", async () => {
    jest.mocked(fetchMyActivities).mockResolvedValue([ACTIVITY]);
    await renderList();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Delete Swimming for kids" }),
    );
    pressAlertButton("Cancel");

    expect(Alert.alert).toHaveBeenCalled();
    expect(deleteActivity).not.toHaveBeenCalled();
  });

  it("shows an error when deleting fails", async () => {
    jest.mocked(fetchMyActivities).mockResolvedValue([ACTIVITY]);
    jest.mocked(deleteActivity).mockRejectedValue(new Error("Network error"));
    await renderList();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Delete Swimming for kids" }),
    );
    pressAlertButton("Delete");

    expect(
      await screen.findByText(
        "The activity could not be deleted. Please try again.",
      ),
    ).toBeOnTheScreen();
  });

  it("shows the extra content of each card, e.g. its places", async () => {
    jest.mocked(fetchMyActivities).mockResolvedValue([ACTIVITY]);
    await render(
      <MyActivitiesList
        onCreate={jest.fn()}
        onEdit={jest.fn()}
        renderCardFooter={(activity) => (
          <Text>{`Places of ${activity.title}`}</Text>
        )}
      />,
      { wrapper: createQueryClientWrapper(createTestQueryClient()) },
    );

    expect(
      await screen.findByText("Places of Swimming for kids"),
    ).toBeOnTheScreen();
  });
});

describe("events in MyActivitiesList", () => {
  const event = {
    ...ACTIVITY,
    id: "event-1",
    title: "Summer workshop",
    type: "event" as const,
    startDate: "2099-07-01",
    endDate: "2099-07-15",
    schedule: [],
  };

  it("shows events alongside regular activities and edits through the existing action", async () => {
    jest.mocked(fetchMyActivities).mockResolvedValue([ACTIVITY, event]);
    const onEdit = jest.fn();
    await renderList(onEdit);

    expect(await screen.findByText("Summer workshop")).toBeOnTheScreen();
    expect(screen.getByText("Swimming for kids")).toBeOnTheScreen();
    expect(screen.getByText("Activity")).toBeOnTheScreen();
    expect(screen.getByText("Event")).toBeOnTheScreen();
    expect(
      screen.getByText(
        `${formatDate(event.startDate)} – ${formatDate(event.endDate)}`,
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole("button", { name: "Edit Summer workshop" }),
    );
    expect(onEdit).toHaveBeenCalledWith("event-1");
  });

  it("deletes an event through the existing confirmation and mutation", async () => {
    jest.mocked(fetchMyActivities).mockResolvedValue([event]);
    jest.mocked(deleteActivity).mockResolvedValue(undefined);
    await renderList();

    await fireEvent.press(
      await screen.findByRole("button", {
        name: "Delete Summer workshop",
      }),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      "Delete activity",
      expect.stringContaining("Summer workshop"),
      expect.any(Array),
    );
    pressAlertButton("Delete");

    await waitFor(() =>
      expect(deleteActivity).toHaveBeenCalledWith("event-1", expect.anything()),
    );
  });
});
