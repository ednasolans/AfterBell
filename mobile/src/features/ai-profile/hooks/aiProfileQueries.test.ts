import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { fetchMyProfile } from "../api/fetchMyProfile";
import { generateProfile } from "../api/generateProfile";
import { hasTechnicalSheet } from "../api/hasTechnicalSheet";
import { approveProfile, saveProfile } from "../api/updateMyProfile";
import { type ProviderProfile } from "../types";
import { profileKeys } from "./profileKeys";
import { useApproveProfile } from "./useApproveProfile";
import { useGenerateProfile } from "./useGenerateProfile";
import { useHasTechnicalSheet } from "./useHasTechnicalSheet";
import { useMyProfile } from "./useMyProfile";
import { useSaveProfile } from "./useSaveProfile";

jest.mock("../api/fetchMyProfile", () => ({ fetchMyProfile: jest.fn() }));
jest.mock("../api/hasTechnicalSheet", () => ({ hasTechnicalSheet: jest.fn() }));
jest.mock("../api/generateProfile", () => ({ generateProfile: jest.fn() }));
jest.mock("../api/updateMyProfile", () => ({
  saveProfile: jest.fn(),
  approveProfile: jest.fn(),
}));

const PROFILE: ProviderProfile = {
  headline: "Music lessons in Lleida",
  description: "A music school.",
  status: "draft",
  generatedAt: "2026-10-24T10:00:00Z",
  approvedAt: null,
};

// Renders a hook inside a fresh QueryClientProvider and spies on invalidations
async function renderWithClient<T>(hook: () => T) {
  const queryClient = createTestQueryClient();
  const invalidate = jest.spyOn(queryClient, "invalidateQueries");
  const { result } = await renderHook(hook, {
    wrapper: createQueryClientWrapper(queryClient),
  });
  return { result, invalidate };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("profileKeys", () => {
  it("starts every key with the key of the profile", () => {
    expect(profileKeys.mine()).toEqual(["provider-profile", "mine"]);
  });
});

describe("useMyProfile", () => {
  it("loads the profile of the provider", async () => {
    jest.mocked(fetchMyProfile).mockResolvedValue(PROFILE);
    const { result } = await renderWithClient(() => useMyProfile());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(PROFILE);
  });
});

describe("useHasTechnicalSheet", () => {
  it("tells whether the provider has a technical sheet", async () => {
    jest.mocked(hasTechnicalSheet).mockResolvedValue(true);
    const { result } = await renderWithClient(() => useHasTechnicalSheet());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });
});

describe("useGenerateProfile", () => {
  it("generates the profile and refreshes it", async () => {
    jest.mocked(generateProfile).mockResolvedValue(undefined);
    const { result, invalidate } = await renderWithClient(() =>
      useGenerateProfile(),
    );

    await act(() => result.current.mutateAsync());

    expect(generateProfile).toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: profileKeys.all });
  });

  it("keeps the error message and refreshes nothing when it fails", async () => {
    jest
      .mocked(generateProfile)
      .mockRejectedValue(new Error("The AI took too long to answer."));
    const { result, invalidate } = await renderWithClient(() =>
      useGenerateProfile(),
    );

    await act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      "The AI took too long to answer.",
    );
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe("useSaveProfile", () => {
  it("saves the edited texts and refreshes the profile", async () => {
    jest.mocked(saveProfile).mockResolvedValue(undefined);
    const { result, invalidate } = await renderWithClient(() =>
      useSaveProfile(),
    );
    const form = { headline: "New", description: "Text" };

    await act(() => result.current.mutateAsync(form));

    expect(saveProfile).toHaveBeenCalledWith(form, expect.anything());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: profileKeys.all });
  });
});

describe("useApproveProfile", () => {
  it("approves the profile and refreshes it", async () => {
    jest.mocked(approveProfile).mockResolvedValue(undefined);
    const { result, invalidate } = await renderWithClient(() =>
      useApproveProfile(),
    );

    await act(() => result.current.mutateAsync());

    expect(approveProfile).toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: profileKeys.all });
  });
});
