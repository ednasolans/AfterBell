import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { deleteActivity } from "../api/deleteActivity";
import { fetchActivity } from "../api/fetchActivity";
import { fetchMyActivities } from "../api/fetchMyActivities";
import { updateActivity } from "../api/updateActivity";
import { type Activity, type ActivityForm } from "../types";
import { activityKeys } from "./activityKeys";
import { useActivity } from "./useActivity";
import { useDeleteActivity } from "./useDeleteActivity";
import { useMyActivities } from "./useMyActivities";
import { useUpdateActivity } from "./useUpdateActivity";

jest.mock("../api/fetchMyActivities", () => ({ fetchMyActivities: jest.fn() }));
jest.mock("../api/fetchActivity", () => ({ fetchActivity: jest.fn() }));
jest.mock("../api/updateActivity", () => ({ updateActivity: jest.fn() }));
jest.mock("../api/deleteActivity", () => ({ deleteActivity: jest.fn() }));

const ACTIVITY: Activity = {
  id: "activity-1",
  accountId: "provider-1",
  providerProfileId: "profile-1",
  addressId: "address-1",
  title: "Swimming for kids",
  description: null,
  minAge: 7,
  maxAge: 12,
  schedule: ["Tuesday 17:00-18:00"],
  price: 30,
  startDate: "2026-10-01",
  endDate: null,
  status: "published",
  createdAt: "2026-10-20T08:00:00Z",
  updatedAt: "2026-10-20T08:00:00Z",
};

const FORM: ActivityForm = {
  title: "Swimming for kids",
  description: "",
  minAge: 7,
  maxAge: 12,
  schedule: ["Tuesday 17:00-18:00"],
  price: 30,
  startDate: "",
  endDate: "",
  addressId: "address-1",
  status: "draft",
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

describe("activityKeys", () => {
  it("starts every key with the key of all activities", () => {
    expect(activityKeys.mine()).toEqual(["activities", "mine"]);
    expect(activityKeys.detail("activity-1")).toEqual([
      "activities",
      "detail",
      "activity-1",
    ]);
  });
});

describe("useMyActivities", () => {
  it("loads the activities of the provider", async () => {
    jest.mocked(fetchMyActivities).mockResolvedValue([ACTIVITY]);
    const { result } = await renderWithClient(() => useMyActivities());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([ACTIVITY]);
  });

  it("reports the error when loading fails", async () => {
    jest
      .mocked(fetchMyActivities)
      .mockRejectedValue(new Error("Network error"));
    const { result } = await renderWithClient(() => useMyActivities());

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useActivity", () => {
  it("loads the activity with the given id", async () => {
    jest.mocked(fetchActivity).mockResolvedValue(ACTIVITY);
    const { result } = await renderWithClient(() => useActivity("activity-1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchActivity).toHaveBeenCalledWith("activity-1");
    expect(result.current.data).toEqual(ACTIVITY);
  });
});

describe("useUpdateActivity", () => {
  it("updates the activity and refreshes every activity query", async () => {
    jest.mocked(updateActivity).mockResolvedValue(undefined);
    const { result, invalidate } = await renderWithClient(() =>
      useUpdateActivity(),
    );

    await act(() =>
      result.current.mutateAsync({ id: "activity-1", form: FORM }),
    );

    expect(updateActivity).toHaveBeenCalledWith(
      { id: "activity-1", form: FORM },
      expect.anything(),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: activityKeys.all });
  });
});

describe("useDeleteActivity", () => {
  it("deletes the activity and refreshes every activity query", async () => {
    jest.mocked(deleteActivity).mockResolvedValue(undefined);
    const { result, invalidate } = await renderWithClient(() =>
      useDeleteActivity(),
    );

    await act(() => result.current.mutateAsync("activity-1"));

    expect(deleteActivity).toHaveBeenCalledWith(
      "activity-1",
      expect.anything(),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: activityKeys.all });
  });

  it("does not refresh anything when deleting fails", async () => {
    jest.mocked(deleteActivity).mockRejectedValue(new Error("Network error"));
    const { result, invalidate } = await renderWithClient(() =>
      useDeleteActivity(),
    );

    await act(() => {
      result.current.mutate("activity-1");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
