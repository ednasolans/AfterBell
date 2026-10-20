import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";

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
});
