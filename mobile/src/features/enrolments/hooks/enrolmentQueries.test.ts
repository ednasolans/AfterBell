import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { cancelEnrolmentRequest } from "../api/cancelEnrolmentRequest";
import { sendEnrolmentRequests } from "../api/sendEnrolmentRequests";
import { enrolmentKeys } from "./enrolmentKeys";
import { useCancelEnrolmentRequest } from "./useCancelEnrolmentRequest";
import { useSendEnrolmentRequests } from "./useSendEnrolmentRequests";

jest.mock("../api/sendEnrolmentRequests", () => ({
  sendEnrolmentRequests: jest.fn(),
}));
jest.mock("../api/cancelEnrolmentRequest", () => ({
  cancelEnrolmentRequest: jest.fn(),
}));

const INPUT = {
  activityId: "a1",
  form: { profileIds: ["anna"], message: "" },
};

async function renderWithClient<T>(hook: () => T) {
  const queryClient = createTestQueryClient();
  const invalidate = jest.spyOn(queryClient, "invalidateQueries");
  const rendered = await renderHook(hook, {
    wrapper: createQueryClientWrapper(queryClient),
  });
  return { ...rendered, invalidate };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useSendEnrolmentRequests", () => {
  it("refreshes the requests after sending", async () => {
    jest.mocked(sendEnrolmentRequests).mockResolvedValue();
    const { result, invalidate } = await renderWithClient(() =>
      useSendEnrolmentRequests(),
    );

    await act(() => result.current.mutateAsync(INPUT));

    expect(sendEnrolmentRequests).toHaveBeenCalledWith(
      INPUT,
      expect.anything(),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: enrolmentKeys.all });
  });

  it("also refreshes them when one profile fails", async () => {
    jest
      .mocked(sendEnrolmentRequests)
      .mockRejectedValue(new Error("This activity is full"));
    const { result, invalidate } = await renderWithClient(() =>
      useSendEnrolmentRequests(),
    );

    await act(() => {
      result.current.mutate(INPUT);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: enrolmentKeys.all });
  });
});

describe("useCancelEnrolmentRequest", () => {
  it("refreshes the requests after cancelling", async () => {
    jest.mocked(cancelEnrolmentRequest).mockResolvedValue();
    const { result, invalidate } = await renderWithClient(() =>
      useCancelEnrolmentRequest(),
    );

    await act(() => result.current.mutateAsync("r1"));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: enrolmentKeys.all });
  });
});
