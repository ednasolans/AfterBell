import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { createActivity } from "../api/createActivity";
import { type ActivityForm } from "../types";
import { activityKeys } from "./activityKeys";
import { useCreateActivity } from "./useCreateActivity";

jest.mock("../api/createActivity", () => ({
  createActivity: jest.fn(),
}));

const mockedCreate = jest.mocked(createActivity);

const FORM: ActivityForm = {
  title: "Swimming for kids",
  description: "",
  category: "swimming",
  type: "whole_year",
  targetAgeRanges: ["7-9", "10-12"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  price: 30,
  pricePeriod: "per_month",
  maxParticipants: 12,
  addressId: "address-1",
};

beforeEach(() => {
  mockedCreate.mockReset();
});

describe("useCreateActivity", () => {
  it("creates the activity and refreshes the lists of activities", async () => {
    mockedCreate.mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useCreateActivity(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    await act(() => result.current.mutateAsync(FORM));

    expect(mockedCreate).toHaveBeenCalledWith(FORM, expect.anything());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: activityKeys.all });
  });

  it("reports the error and does not refresh the lists when creating fails", async () => {
    mockedCreate.mockRejectedValue(new Error("Network error"));
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useCreateActivity(), {
      wrapper: createQueryClientWrapper(queryClient),
    });

    // Run the mutation without awaiting it inside the test: waitFor wraps
    // every state update in act() until the error is reported
    await act(() => {
      result.current.mutate(FORM);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
