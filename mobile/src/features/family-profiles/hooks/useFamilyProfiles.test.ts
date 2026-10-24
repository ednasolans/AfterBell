
import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import {
  createFamilyProfile,
  fetchFamilyProfile,
  fetchFamilyProfiles,
  updateFamilyProfile,
} from "../api/familyProfiles";

import type {
  FamilyProfile,
  FamilyProfileFormValues,
} from "../types";

import {
  familyProfileKeys,
  useCreateFamilyProfile,
  useFamilyProfile,
  useFamilyProfiles,
  useUpdateFamilyProfile,
} from "./useFamilyProfiles";

// Mock API calls: these tests do not connect to Supabase.
jest.mock("../api/familyProfiles", () => ({
  createFamilyProfile: jest.fn(),
  fetchFamilyProfile: jest.fn(),
  fetchFamilyProfiles: jest.fn(),
  updateFamilyProfile: jest.fn(),
}));

const PROFILE: FamilyProfile = {
  id: "profile-1",
  family_group_id: "group-1",
  first_name: "Anna",
  age_range: "7-9",
  interests: ["music", "swimming"],
  created_at: "2026-10-24T10:00:00Z",
};

const FORM: FamilyProfileFormValues = {
  firstName: "Anna",
  ageRange: "7-9",
  interests: ["music", "swimming"],
};

// Each test gets a fresh TanStack Query client.
async function renderWithClient<T>(hook: () => T) {
  const queryClient = createTestQueryClient();

  const invalidate = jest.spyOn(
    queryClient,
    "invalidateQueries",
  );

  const { result } = await renderHook(hook, {
    wrapper: createQueryClientWrapper(queryClient),
  });

  return { result, invalidate };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("familyProfileKeys", () => {
  it("creates the correct keys", () => {
    expect(familyProfileKeys.all).toEqual([
      "family-profiles",
    ]);

    expect(familyProfileKeys.list("user-1")).toEqual([
      "family-profiles",
      "user-1",
      "list",
    ]);

    expect(
      familyProfileKeys.detail("user-1", "profile-1"),
    ).toEqual([
      "family-profiles",
      "user-1",
      "detail",
      "profile-1",
    ]);
  });
});

describe("useFamilyProfiles", () => {
  it("loads the profiles of the current user", async () => {
    jest.mocked(fetchFamilyProfiles).mockResolvedValue([PROFILE]);

    const { result } = await renderWithClient(() =>
      useFamilyProfiles("user-1"),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([PROFILE]);

    expect(fetchFamilyProfiles).toHaveBeenCalledTimes(1);
  });

  it("reports an error when loading fails", async () => {
    jest
      .mocked(fetchFamilyProfiles)
      .mockRejectedValue(new Error("Network error"));

    const { result } = await renderWithClient(() =>
      useFamilyProfiles("user-1"),
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe(
      "Network error",
    );
  });

  it("does not query without a user id", async () => {
    const { result } = await renderWithClient(() =>
      useFamilyProfiles(""),
    );

    expect(result.current.fetchStatus).toBe("idle");

    expect(fetchFamilyProfiles).not.toHaveBeenCalled();
  });
});

describe("useFamilyProfile", () => {
  it("loads the requested profile", async () => {
    jest.mocked(fetchFamilyProfile).mockResolvedValue(PROFILE);

    const { result } = await renderWithClient(() =>
      useFamilyProfile("user-1", "profile-1"),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fetchFamilyProfile).toHaveBeenCalledWith("profile-1");

    expect(result.current.data).toEqual(PROFILE);
  });

  it("does not load without a profile id", async () => {
    const { result } = await renderWithClient(() =>
      useFamilyProfile("user-1", undefined),
    );

    expect(result.current.fetchStatus).toBe("idle");

    expect(fetchFamilyProfile).not.toHaveBeenCalled();
  });
});

describe("useCreateFamilyProfile", () => {
  it("creates a profile and refreshes the family queries", async () => {
    jest.mocked(createFamilyProfile).mockResolvedValue(PROFILE);

    const { result, invalidate } = await renderWithClient(() =>
      useCreateFamilyProfile(),
    );

    await act(() =>
      result.current.mutateAsync(FORM),
    );

    expect(createFamilyProfile).toHaveBeenCalledWith(
      FORM,
      expect.anything(),
    );

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: familyProfileKeys.all,
    });
  });

  it("does not invalidate queries when creation fails", async () => {
    jest
      .mocked(createFamilyProfile)
      .mockRejectedValue(new Error("Insert failed"));

    const { result, invalidate } = await renderWithClient(() =>
      useCreateFamilyProfile(),
    );

    await act(() => {
      result.current.mutate(FORM);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe("useUpdateFamilyProfile", () => {
  it("updates a profile and refreshes the family queries", async () => {
    jest.mocked(updateFamilyProfile).mockResolvedValue(PROFILE);

    const { result, invalidate } = await renderWithClient(() =>
      useUpdateFamilyProfile(),
    );

    await act(() =>
      result.current.mutateAsync({
        id: "profile-1",
        values: FORM,
      }),
    );

    expect(updateFamilyProfile).toHaveBeenCalledWith(
      "profile-1",
      FORM,
    );

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: familyProfileKeys.all,
    });
  });

  it("does not invalidate queries when the update fails", async () => {
    jest
      .mocked(updateFamilyProfile)
      .mockRejectedValue(new Error("Update failed"));

    const { result, invalidate } = await renderWithClient(() =>
      useUpdateFamilyProfile(),
    );

    await act(() => {
      result.current.mutate({
        id: "profile-1",
        values: FORM,
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(invalidate).not.toHaveBeenCalled();
  });
});
