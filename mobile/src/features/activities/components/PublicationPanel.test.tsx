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

import { changeActivityStatus } from "../api/changeActivityStatus";
import { fetchPublicationIssues } from "../api/fetchPublicationIssues";
import { type Activity } from "@/lib/activity";
import { PublicationPanel } from "./PublicationPanel";

jest.mock("../api/changeActivityStatus", () => ({
  changeActivityStatus: jest.fn(),
}));
jest.mock("../api/fetchPublicationIssues", () => ({
  fetchPublicationIssues: jest.fn(),
}));

const PUBLISHED: Activity = { ...ACTIVITY, status: "published" };

async function renderPanel(activity: Activity = ACTIVITY) {
  await render(<PublicationPanel activity={activity} />, {
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
});

describe("PublicationPanel", () => {
  it("lets the provider publish a complete draft after confirming", async () => {
    jest.mocked(fetchPublicationIssues).mockResolvedValue([]);
    jest.mocked(changeActivityStatus).mockResolvedValue();
    await renderPanel();

    expect(screen.getByText("Draft")).toBeOnTheScreen();
    await fireEvent.press(
      await screen.findByRole("button", { name: "Publish" }),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      "Publish activity",
      expect.stringContaining("Swimming for kids"),
      expect.any(Array),
    );
    expect(changeActivityStatus).not.toHaveBeenCalled();

    pressAlertButton("Publish");

    expect(
      await screen.findByText("Your activity is now published."),
    ).toBeOnTheScreen();
    expect(changeActivityStatus).toHaveBeenCalledWith(
      { id: "activity-1", status: "published" },
      expect.anything(),
    );
  });

  it("does not publish when the provider cancels", async () => {
    jest.mocked(fetchPublicationIssues).mockResolvedValue([]);
    await renderPanel();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Publish" }),
    );
    pressAlertButton("Cancel");

    expect(changeActivityStatus).not.toHaveBeenCalled();
  });

  it("lists everything that is missing and hides the publish button", async () => {
    jest
      .mocked(fetchPublicationIssues)
      .mockResolvedValue(["address", "language"]);
    await renderPanel();

    expect(
      await screen.findByText(
        "• Use an address with street, number, postal code, city, province and country.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("• Add at least one language and level."),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Publish" }),
    ).not.toBeOnTheScreen();
  });

  it("shows that it is checking what is missing", async () => {
    jest.mocked(fetchPublicationIssues).mockReturnValue(new Promise(() => {}));
    await renderPanel();

    expect(screen.getByText("Checking what is missing…")).toBeOnTheScreen();
  });

  it("lets the provider retry when the check fails", async () => {
    jest
      .mocked(fetchPublicationIssues)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([]);
    await renderPanel();

    expect(
      await screen.findByText("We could not check if it can be published."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    expect(
      await screen.findByRole("button", { name: "Publish" }),
    ).toBeOnTheScreen();
  });

  it("lets the provider unpublish a published activity after confirming", async () => {
    jest.mocked(changeActivityStatus).mockResolvedValue();
    await renderPanel(PUBLISHED);

    expect(screen.getByText("Published")).toBeOnTheScreen();
    expect(
      screen.getByText("Customers can see this activity."),
    ).toBeOnTheScreen();
    expect(fetchPublicationIssues).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Unpublish" }));
    pressAlertButton("Unpublish");

    expect(
      await screen.findByText(
        "Your activity is no longer visible to customers.",
      ),
    ).toBeOnTheScreen();
    expect(changeActivityStatus).toHaveBeenCalledWith(
      { id: "activity-1", status: "draft" },
      expect.anything(),
    );
  });

  it("shows why the status could not be changed", async () => {
    jest
      .mocked(changeActivityStatus)
      .mockRejectedValue(new Error("Network request failed"));
    await renderPanel(PUBLISHED);

    await fireEvent.press(screen.getByRole("button", { name: "Unpublish" }));
    pressAlertButton("Unpublish");

    await waitFor(() =>
      expect(
        screen.getByText(
          "The status could not be changed: Network request failed",
        ),
      ).toBeOnTheScreen(),
    );
  });
});
