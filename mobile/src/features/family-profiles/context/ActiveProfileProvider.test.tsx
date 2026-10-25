
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";

import { supabase } from "../../../lib/supabase";
import { fetchFamilyProfiles } from "../api/familyProfiles";
import type { FamilyProfile } from "../types";
import {
  ActiveProfileProvider,
  useActiveProfile,
} from "./ActiveProfileProvider";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

jest.mock("../../../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

jest.mock("../api/familyProfiles", () => ({
  fetchFamilyProfiles: jest.fn(),
}));

const mockedGetUser = jest.mocked(supabase.auth.getUser);
const mockedAuthChange = jest.mocked(
  supabase.auth.onAuthStateChange,
);
const mockedFetchProfiles = jest.mocked(fetchFamilyProfiles);
const mockedGetItem = jest.mocked(AsyncStorage.getItem);
const mockedSetItem = jest.mocked(AsyncStorage.setItem);

const USER_ID = "customer-test-123";

const PAU = {
  id: "10000000-0000-4000-8000-000000000001",
  family_group_id: "20000000-0000-4000-8000-000000000001",
  first_name: "Pau",
  age_range: "7-9",
  interests: ["football"],
  created_at: "2026-01-01T10:00:00.000Z",
} as FamilyProfile;

const LAIA = {
  id: "10000000-0000-4000-8000-000000000002",
  family_group_id: PAU.family_group_id,
  first_name: "Laia",
  age_range: "4-6",
  interests: ["music"],
  created_at: "2026-01-02T10:00:00.000Z",
} as FamilyProfile;

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <QueryClientProvider client={client}>
        <ActiveProfileProvider>
          {children}
        </ActiveProfileProvider>
      </QueryClientProvider>
    );
  }

  return Wrapper;
}

describe("ActiveProfileProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedGetUser.mockResolvedValue({
      data: {
        user: { id: USER_ID },
      },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getUser>>);

    
    mockedAuthChange.mockReturnValue({
      data: {
        subscription: {
        unsubscribe: jest.fn(),
        },
      },
    } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>);


    mockedFetchProfiles.mockResolvedValue([PAU, LAIA]);
    mockedGetItem.mockResolvedValue(null);
    mockedSetItem.mockResolvedValue();
  });

  test("selects the main profile by default", async () => {
    const { result } = await renderHook(
      () => useActiveProfile(),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.activeProfileId).toBe(PAU.id);
    });

    expect(result.current.activeProfile?.first_name).toBe(
      "Pau",
    );
  });

  test("restores a saved profile from AsyncStorage", async () => {
    mockedGetItem.mockResolvedValue(LAIA.id);

    const { result } = await renderHook(
      () => useActiveProfile(),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.activeProfileId).toBe(LAIA.id);
    });

    expect(mockedGetItem).toHaveBeenCalledWith(
      `afterbell:active-family-profile:${USER_ID}`,
    );
  });

  test("saves the selected profile to AsyncStorage", async () => {
    const { result } = await renderHook(
      () => useActiveProfile(),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.activeProfileId).toBe(PAU.id);
    });

    await act(async () => {
      await result.current.setActiveProfile(LAIA.id);
    });

    expect(mockedSetItem).toHaveBeenCalledWith(
      `afterbell:active-family-profile:${USER_ID}`,
      LAIA.id,
    );

    expect(result.current.activeProfileId).toBe(LAIA.id);
  });

  test("rejects a profile outside the current family", async () => {
    const { result } = await renderHook(
      () => useActiveProfile(),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      result.current.setActiveProfile("unknown-profile"),
    ).rejects.toThrow(
      "This profile does not belong to the current family",
    );

    expect(mockedSetItem).not.toHaveBeenCalled();
  });

  test("falls back to the main profile if saved ID is invalid", async () => {
    mockedGetItem.mockResolvedValue("deleted-profile");

    const { result } = await renderHook(
      () => useActiveProfile(),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.activeProfileId).toBe(PAU.id);
    });
  });

  test("handles empty family profiles", async () => {
    mockedFetchProfiles.mockResolvedValue([]);

    const { result } = await renderHook(
      () => useActiveProfile(),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeProfile).toBeNull();
    expect(result.current.activeProfileId).toBeNull();
    expect(result.current.profiles).toEqual([]);
  });

  test("handles errors while reading AsyncStorage", async () => {
    const consoleSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    mockedGetItem.mockRejectedValue(
      new Error("Storage unavailable"),
    );

    try {
      const { result } = await renderHook(
        () => useActiveProfile(),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.activeProfileId).toBe(PAU.id);
      });

      expect(consoleSpy).toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  test("does not change state when saving fails", async () => {
    mockedSetItem.mockRejectedValue(
      new Error("Write failed"),
    );

    const { result } = await renderHook(
      () => useActiveProfile(),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.activeProfileId).toBe(PAU.id);
    });

    await expect(
      result.current.setActiveProfile(LAIA.id),
    ).rejects.toThrow("Write failed");

    expect(result.current.activeProfileId).toBe(PAU.id);
  });

  test("reports a profile loading error", async () => {
    mockedFetchProfiles.mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = await renderHook(
      () => useActiveProfile(),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  test("refetches profiles when requested", async () => {
    const { result } = await renderHook(
      () => useActiveProfile(),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshProfiles();
    });

    expect(mockedFetchProfiles).toHaveBeenCalledTimes(2);
  });
});
