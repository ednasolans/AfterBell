import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { fetchMyProfile } from "../api/fetchMyProfile";
import { generateProfile } from "../api/generateProfile";
import { hasTechnicalSheet } from "../api/hasTechnicalSheet";
import { approveProfile, saveProfile } from "../api/updateMyProfile";
import { type ProviderProfile } from "../types";
import { AiProfile } from "./AiProfile";

jest.mock("../api/fetchMyProfile", () => ({ fetchMyProfile: jest.fn() }));
jest.mock("../api/hasTechnicalSheet", () => ({ hasTechnicalSheet: jest.fn() }));
jest.mock("../api/generateProfile", () => ({ generateProfile: jest.fn() }));
jest.mock("../api/updateMyProfile", () => ({
  saveProfile: jest.fn(),
  approveProfile: jest.fn(),
}));

const DRAFT: ProviderProfile = {
  headline: "Music lessons in Lleida",
  description: "A music school offering piano and guitar classes.",
  status: "draft",
  generatedAt: "2026-10-24T10:00:00Z",
  approvedAt: null,
};

async function renderAiProfile() {
  await render(<AiProfile />, {
    wrapper: createQueryClientWrapper(createTestQueryClient()),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(hasTechnicalSheet).mockResolvedValue(true);
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

  it("lets the user retry when loading fails", async () => {
    jest.mocked(fetchMyProfile).mockRejectedValue(new Error("Network error"));
    await renderAiProfile();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Try again" }),
    );

    expect(fetchMyProfile).toHaveBeenCalledTimes(2);
  });
});
