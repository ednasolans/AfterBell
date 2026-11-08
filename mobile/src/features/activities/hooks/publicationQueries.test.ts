import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { changeActivityStatus } from "../api/changeActivityStatus";
import { fetchPublicationIssues } from "../api/fetchPublicationIssues";
import { activityKeys } from "./activityKeys";
import { useChangeActivityStatus } from "./useChangeActivityStatus";
import { usePublicationIssues } from "./usePublicationIssues";

jest.mock("../api/changeActivityStatus", () => ({
  changeActivityStatus: jest.fn(),
}));
jest.mock("../api/fetchPublicationIssues", () => ({
  fetchPublicationIssues: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("usePublicationIssues", () => {
  it("loads what is missing to publish the activity", async () => {
    jest.mocked(fetchPublicationIssues).mockResolvedValue(["address"]);
    const queryClient = createTestQueryClient();

    const { result } = await renderHook(
      () => usePublicationIssues("activity-1"),
      { wrapper: createQueryClientWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(["address"]);
    expect(fetchPublicationIssues).toHaveBeenCalledWith("activity-1");
    expect(
      queryClient.getQueryData(activityKeys.publicationIssues("activity-1")),
    ).toEqual(["address"]);
  });
});

describe("useChangeActivityStatus", () => {
  it("changes the status and refreshes every activity query", async () => {
    jest.mocked(changeActivityStatus).mockResolvedValue();
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useChangeActivityStatus(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    await act(async () => {
      await result.current.mutateAsync({
        id: "activity-1",
        status: "published",
      });
    });

    expect(changeActivityStatus).toHaveBeenCalledWith(
      { id: "activity-1", status: "published" },
      expect.anything(),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: activityKeys.all });
  });

  it("reports the error and refreshes nothing when it fails", async () => {
    jest
      .mocked(changeActivityStatus)
      .mockRejectedValue(
        new Error("A complete technical sheet is required to publish"),
      );
    const queryClient = createTestQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useChangeActivityStatus(), {
      wrapper: createQueryClientWrapper(queryClient),
    });
    await act(async () => {
      result.current.mutate({ id: "activity-1", status: "published" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      "A complete technical sheet is required to publish",
    );
    expect(invalidate).not.toHaveBeenCalled();
  });
});
