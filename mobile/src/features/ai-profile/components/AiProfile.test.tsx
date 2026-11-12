import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { usePreventRemove } from "expo-router";
import { Alert, type AlertButton } from "react-native";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { fetchMyProfile } from "../api/fetchMyProfile";
import { fetchProfileIsOutdated } from "../api/fetchProfileIsOutdated";
import { generateProfile } from "../api/generateProfile";
import { hasTechnicalSheet } from "../api/hasTechnicalSheet";
import {
  approveProfile,
  discardProfileChanges,
  saveProfile,
} from "../api/updateMyProfile";
import { type ProviderProfile } from "../types";
import { AiProfile } from "./AiProfile";

jest.mock("../api/fetchMyProfile", () => ({ fetchMyProfile: jest.fn() }));
jest.mock("../api/fetchProfileIsOutdated", () => ({
  fetchProfileIsOutdated: jest.fn(),
}));
jest.mock("../api/hasTechnicalSheet", () => ({ hasTechnicalSheet: jest.fn() }));
jest.mock("../api/generateProfile", () => ({ generateProfile: jest.fn() }));
jest.mock("../api/updateMyProfile", () => ({
  saveProfile: jest.fn(),
  approveProfile: jest.fn(),
  discardProfileChanges: jest.fn(),
}));
// There is no navigator in the tests: record the calls to usePreventRemove
jest.mock("expo-router", () => ({ usePreventRemove: jest.fn() }));

const DRAFT: ProviderProfile = {
  headline: "Music lessons in Lleida",
  description: "A music school offering piano and guitar classes.",
  status: "draft",
  generatedAt: "2026-10-24T10:00:00Z",
  approvedAt: null,
  approvedHeadline: null,
  approvedDescription: null,
};

async function renderAiProfile() {
  await render(<AiProfile />, {
    wrapper: createQueryClientWrapper(createTestQueryClient()),
  });
}

const PUBLISHED: ProviderProfile = {
  ...DRAFT,
  status: "approved",
  approvedAt: "2026-10-24T11:00:00Z",
  approvedHeadline: DRAFT.headline,
  approvedDescription: DRAFT.description,
};

// Presses one of the buttons of the last dialog shown with Alert.alert
async function pressAlertButton(text: string) {
  const calls = jest.mocked(Alert.alert).mock.calls;
  const buttons = (calls[calls.length - 1][2] ?? []) as AlertButton[];
  await act(async () => {
    await buttons.find((button) => button.text === text)?.onPress?.();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert");
  jest.mocked(hasTechnicalSheet).mockResolvedValue(true);
  jest.mocked(fetchProfileIsOutdated).mockResolvedValue(false);
});

describe("AiProfile", () => {
  it("offers to generate the profile when there is none", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(null);
    jest.mocked(generateProfile).mockResolvedValue(undefined);
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Generate profile with AI" }),
    );

    expect(generateProfile).toHaveBeenCalled();
  });

  it("asks for the technical sheet before generating", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(null);
    jest.mocked(hasTechnicalSheet).mockResolvedValue(false);
    await renderAiProfile();

    expect(
      await screen.findByText(/Save your technical sheet first/),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Generate profile with AI" }),
    ).toBeNull();
  });

  it("shows the message of a failed generation", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(null);
    jest
      .mocked(generateProfile)
      .mockRejectedValue(
        new Error("The AI took too long to answer. Please try again."),
      );
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Generate profile with AI" }),
    );

    expect(
      await screen.findByText(
        "The AI took too long to answer. Please try again.",
      ),
    ).toBeTruthy();
  });

  it("shows the draft and saves the edited texts", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(DRAFT);
    jest.mocked(saveProfile).mockResolvedValue(undefined);
    await renderAiProfile();

    expect(await screen.findByText("Draft")).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText("Headline"),
      "New headline",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

    expect(saveProfile).toHaveBeenCalledWith(
      { headline: "New headline", description: DRAFT.description },
      expect.anything(),
    );
  });

  it("does not save an empty headline", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(DRAFT);
    await renderAiProfile();

    await fireEvent.changeText(await screen.findByLabelText("Headline"), "  ");
    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Headline is required.")).toBeTruthy();
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it("asks for confirmation, saves and publishes the draft", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(DRAFT);
    jest.mocked(saveProfile).mockResolvedValue(undefined);
    jest.mocked(approveProfile).mockResolvedValue(undefined);
    const alert = jest.spyOn(Alert, "alert");
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Approve and publish" }),
    );
    const buttons = alert.mock.calls[0][2] ?? [];
    const publish = buttons.find((button) => button.text === "Publish");
    await act(async () => {
      await publish?.onPress?.();
    });

    expect(saveProfile).toHaveBeenCalled();
    expect(approveProfile).toHaveBeenCalled();
  });

  it("shows a published profile without editing", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue({
      ...DRAFT,
      status: "approved",
      approvedAt: "2026-10-24T11:00:00Z",
    });
    await renderAiProfile();

    expect(await screen.findByText("Published")).toBeTruthy();
    expect(screen.getByText(DRAFT.headline)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });
  it("asks for confirmation before regenerating a published profile", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(PUBLISHED);
    jest.mocked(generateProfile).mockResolvedValue(undefined);
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Regenerate profile" }),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      "Regenerate your profile?",
      expect.stringContaining("until you approve the new one"),
      expect.any(Array),
    );
    expect(generateProfile).not.toHaveBeenCalled();

    await pressAlertButton("Regenerate");

    expect(generateProfile).toHaveBeenCalled();
  });

  it("does not regenerate when the provider cancels", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(PUBLISHED);
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Regenerate profile" }),
    );
    await pressAlertButton("Cancel");

    expect(generateProfile).not.toHaveBeenCalled();
  });

  it("keeps the published profile when regenerating fails", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(PUBLISHED);
    jest
      .mocked(generateProfile)
      .mockRejectedValue(new Error("The AI is not available right now."));
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Regenerate profile" }),
    );
    await pressAlertButton("Regenerate");

    expect(
      await screen.findByText("The AI is not available right now."),
    ).toBeTruthy();
    expect(screen.getByText(DRAFT.headline)).toBeTruthy();
  });

  it("warns when the technical sheet changed and offers to regenerate", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(PUBLISHED);
    jest.mocked(fetchProfileIsOutdated).mockResolvedValue(true);
    await renderAiProfile();

    expect(
      await screen.findByText(/Your technical sheet changed/),
    ).toBeTruthy();
    await fireEvent.press(
      screen.getByRole("button", { name: "Regenerate now" }),
    );

    expect(Alert.alert).toHaveBeenCalledWith(
      "Regenerate your profile?",
      expect.any(String),
      expect.any(Array),
    );
  });

  it("does not warn when the profile is up to date", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(PUBLISHED);
    await renderAiProfile();

    expect(await screen.findByText("Published")).toBeTruthy();
    expect(screen.queryByText(/Your technical sheet changed/)).toBeNull();
  });

  it("generates an outdated draft again without asking", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(DRAFT);
    jest.mocked(fetchProfileIsOutdated).mockResolvedValue(true);
    jest.mocked(generateProfile).mockResolvedValue(undefined);
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Regenerate now" }),
    );

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(generateProfile).toHaveBeenCalled();
  });

  it("shows when a new version is pending approval", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue({
      ...PUBLISHED,
      status: "pending_approval",
      headline: "New headline",
    });
    await renderAiProfile();

    expect(
      await screen.findByLabelText("Status: Pending approval"),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Regenerate profile" }),
    ).toBeTruthy();
  });

  it("counts the characters of each text", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(DRAFT);
    await renderAiProfile();

    expect(await screen.findByText("23 / 120")).toBeTruthy();
    expect(screen.getByText("49 / 2000")).toBeTruthy();
  });

  it("marks a text that is too long", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(DRAFT);
    await renderAiProfile();

    await fireEvent.changeText(
      await screen.findByLabelText("Headline"),
      "a".repeat(121),
    );

    expect(screen.getByText("121 / 120")).toBeTruthy();
  });

  it("shows when the profile could not be published", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(DRAFT);
    jest.mocked(saveProfile).mockResolvedValue(undefined);
    jest.mocked(approveProfile).mockRejectedValue(new Error("Network error"));
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Approve and publish" }),
    );
    await pressAlertButton("Publish");

    expect(
      await screen.findByText(
        "Your profile could not be published. Please try again.",
      ),
    ).toBeTruthy();
  });

  it("does not offer to discard a draft that was never published", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(DRAFT);
    await renderAiProfile();

    expect(await screen.findByText("Draft")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Discard changes" }),
    ).toBeNull();
  });

  it("opens the editor of the published profile and closes it", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(PUBLISHED);
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Edit text" }),
    );
    expect(
      screen.queryByRole("button", { name: "Approve and publish" }),
    ).toBeNull();
    // Nothing changed: it closes without asking
    await fireEvent.press(
      screen.getByRole("button", { name: "Cancel editing" }),
    );

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Edit text" })).toBeTruthy();
  });

  it("asks before closing the editor with changes", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(PUBLISHED);
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Edit text" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Headline"),
      "New headline",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Cancel editing" }),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      "Go back to your published profile?",
      "The new text will be lost.",
      expect.any(Array),
    );
    await pressAlertButton("Discard");

    expect(screen.getByRole("button", { name: "Edit text" })).toBeTruthy();
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it("saves the edited published profile for a new approval", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(PUBLISHED);
    jest.mocked(saveProfile).mockResolvedValue(undefined);
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Edit text" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Headline"),
      "New headline",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Description"),
      "New description",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

    expect(saveProfile).toHaveBeenCalledWith(
      { headline: "New headline", description: "New description" },
      expect.anything(),
    );
  });

  it("goes back to the published version after confirming", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue({
      ...PUBLISHED,
      status: "pending_approval",
      headline: "New headline",
    });
    jest.mocked(discardProfileChanges).mockResolvedValue(undefined);
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Discard changes" }),
    );
    expect(discardProfileChanges).not.toHaveBeenCalled();
    await pressAlertButton("Discard");

    expect(discardProfileChanges).toHaveBeenCalled();
  });

  it("shows when the changes could not be discarded", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue({
      ...PUBLISHED,
      status: "pending_approval",
      headline: "New headline",
    });
    jest
      .mocked(discardProfileChanges)
      .mockRejectedValue(new Error("Network error"));
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Discard changes" }),
    );
    await pressAlertButton("Discard");

    expect(
      await screen.findByText(
        "Your changes could not be discarded. Please try again.",
      ),
    ).toBeTruthy();
  });

  it("asks before leaving the screen with unsaved changes", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(DRAFT);
    await renderAiProfile();

    await fireEvent.changeText(
      await screen.findByLabelText("Headline"),
      "New headline",
    );
    const calls = jest.mocked(usePreventRemove).mock.calls;
    const [preventRemove, onPrevented] = calls[calls.length - 1];
    expect(preventRemove).toBe(true);

    const repeat = jest.fn();
    onPrevented?.({ data: { action: { type: "GO_BACK" } }, repeat });
    expect(Alert.alert).toHaveBeenCalledWith(
      "Discard your changes?",
      expect.any(String),
      expect.any(Array),
    );
    await pressAlertButton("Discard");

    expect(repeat).toHaveBeenCalled();
  });

  it("confirms that the profile is published", async () => {
    jest
      .mocked(fetchMyProfile)
      .mockResolvedValueOnce({
        ...PUBLISHED,
        status: "pending_approval",
        headline: "New headline",
      })
      .mockResolvedValue({ ...PUBLISHED, headline: "New headline" });
    jest.mocked(saveProfile).mockResolvedValue(undefined);
    jest.mocked(approveProfile).mockResolvedValue(undefined);
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Approve and publish" }),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      "Publish your profile?",
      "Families will see this version instead of the current one.",
      expect.any(Array),
    );
    await pressAlertButton("Publish");

    expect(await screen.findByText("Your profile is published.")).toBeTruthy();
  });

  it("lets the user retry when loading fails", async () => {
    jest.mocked(fetchMyProfile).mockRejectedValue(new Error("Network error"));
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Try again" }),
    );

    expect(fetchMyProfile).toHaveBeenCalledTimes(2);
  });
});
