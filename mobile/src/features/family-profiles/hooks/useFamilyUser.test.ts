
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { supabase } from "@/lib/supabase";
import { useFamilyUser } from "./useFamilyUser";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

const mockedGetUser = jest.mocked(supabase.auth.getUser);
const mockedAuthChange = jest.mocked(
  supabase.auth.onAuthStateChange,
);

const USER_ID = "10000000-0000-4000-8000-000000000001";
const SECOND_USER_ID = "10000000-0000-4000-8000-000000000002";

type AuthCallback = Parameters<
  typeof supabase.auth.onAuthStateChange
>[0];

let authCallback: AuthCallback;
let unsubscribeMock: jest.Mock;

function mockGetUser(userId: string | null) {
  mockedGetUser.mockResolvedValue({
    data: {
      user: userId ? { id: userId } : null,
    },
    error: null,
  } as unknown as Awaited<
    ReturnType<typeof supabase.auth.getUser>
  >);
}

function emitAuthChange(
  userId: string | null,
) {
  authCallback(
    userId ? "SIGNED_IN" : "SIGNED_OUT",
    userId
      ? ({
          user: { id: userId },
        } as Parameters<AuthCallback>[1])
      : null,
  );
}

describe("useFamilyUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    unsubscribeMock = jest.fn();

    mockGetUser(USER_ID);

    mockedAuthChange.mockImplementation((callback) => {
      authCallback = callback;

      return {
        data: {
          subscription: {
            unsubscribe: unsubscribeMock,
          },
        },
      } as unknown as ReturnType<
        typeof supabase.auth.onAuthStateChange
      >;
    });
  });

  test("starts with loading true and an empty userId", async () => {
    let resolveGetUser!: (
      response: Awaited<
        ReturnType<typeof supabase.auth.getUser>
      >,
    ) => void;

    mockedGetUser.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGetUser = resolve;
        }),
    );

    const { result } = await renderHook(() => useFamilyUser());

    expect(result.current.userId).toBe("");
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveGetUser({
        data: {
          user: { id: USER_ID },
        },
        error: null,
      } as unknown as Awaited<
        ReturnType<typeof supabase.auth.getUser>
      >);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.userId).toBe(USER_ID);
    });
  });

  test("returns the authenticated user ID", async () => {
    const { result } = await renderHook(() => useFamilyUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.userId).toBe(USER_ID);
    });

    expect(mockedGetUser).toHaveBeenCalledTimes(1);
    expect(mockedAuthChange).toHaveBeenCalledTimes(1);
  });

  test("returns an empty userId when no user is authenticated", async () => {
    mockGetUser(null);

    const { result } = await renderHook(() => useFamilyUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.userId).toBe("");
  });

  test("updates the user ID when a new user signs in", async () => {
    mockGetUser(null);

    const { result } = await renderHook(() => useFamilyUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.userId).toBe("");

    await act(async () => {
      emitAuthChange(USER_ID);
    });

    expect(result.current.userId).toBe(USER_ID);
    expect(result.current.loading).toBe(false);
  });

  test("clears the user ID when the user signs out", async () => {
    const { result } = await renderHook(() => useFamilyUser());

    await waitFor(() => {
      expect(result.current.userId).toBe(USER_ID);
    });

    await act(async () => {
      emitAuthChange(null);
    });

    expect(result.current.userId).toBe("");
    expect(result.current.loading).toBe(false);
  });

  test("updates the user ID when the authenticated account changes", async () => {
    const { result } = await renderHook(() => useFamilyUser());

    await waitFor(() => {
      expect(result.current.userId).toBe(USER_ID);
    });

    await act(async () => {
      emitAuthChange(SECOND_USER_ID);
    });

    expect(result.current.userId).toBe(SECOND_USER_ID);
    expect(result.current.loading).toBe(false);
  });

  test("unsubscribes from auth changes on unmount", async () => {
    const { unmount } = await renderHook(
      () => useFamilyUser(),
    );

    await act(async () => {
      await unmount();
    });

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  test("ignores a pending getUser response after unmount", async () => {
    let resolveGetUser!: (
      response: Awaited<
        ReturnType<typeof supabase.auth.getUser>
      >,
    ) => void;

    mockedGetUser.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGetUser = resolve;
        }),
    );

    const { unmount } = await renderHook(
      () => useFamilyUser(),
    );

    await act(async () => {
      await unmount();
    });

    await act(async () => {
      resolveGetUser({
        data: {
          user: { id: USER_ID },
        },
        error: null,
      } as unknown as Awaited<
        ReturnType<typeof supabase.auth.getUser>
      >);
    });

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });
});
