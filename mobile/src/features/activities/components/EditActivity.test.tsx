import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import { ACTIVITY } from "@/test-utils/activityFixtures";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { fetchActivity } from "../api/fetchActivity";
import { toActivityForm } from "../api/toActivityForm";
import { updateActivity } from "../api/updateActivity";
import { EditActivity } from "./EditActivity";

jest.mock("../api/fetchActivity", () => ({ fetchActivity: jest.fn() }));
jest.mock("../api/updateActivity", () => ({ updateActivity: jest.fn() }));
jest.mock("../api/fetchMyAddresses", () => ({
  fetchMyAddresses: jest.fn().mockResolvedValue([]),
}));

async function renderEdit(onSaved = jest.fn()) {
  await render(<EditActivity id="activity-1" onSaved={onSaved} />, {
    wrapper: createQueryClientWrapper(createTestQueryClient()),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("EditActivity", () => {
  it("fills in the form with the saved activity", async () => {
    jest.mocked(fetchActivity).mockResolvedValue(ACTIVITY);
    await renderEdit();

    expect(
      await screen.findByDisplayValue("Swimming for kids"),
    ).toBeOnTheScreen();
    expect(fetchActivity).toHaveBeenCalledWith("activity-1");
  });

  it("saves the changes to the same activity", async () => {
    jest.mocked(fetchActivity).mockResolvedValue(ACTIVITY);
    jest.mocked(updateActivity).mockResolvedValue(undefined);
    const onSaved = jest.fn();
    await renderEdit(onSaved);

    await fireEvent.changeText(
      await screen.findByLabelText("Title"),
      "Swimming for teens",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(updateActivity).toHaveBeenCalledWith(
      {
        id: "activity-1",
        form: { ...toActivityForm(ACTIVITY), title: "Swimming for teens" },
      },
      expect.anything(),
    );
  });

  it("shows an error when the activity cannot be loaded and tries again", async () => {
    jest
      .mocked(fetchActivity)
      .mockRejectedValueOnce(new Error("Not found"))
      .mockResolvedValueOnce(ACTIVITY);
    await renderEdit();

    expect(
      await screen.findByText("The activity could not be loaded."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByDisplayValue("Swimming for kids"),
    ).toBeOnTheScreen();
  });
});
