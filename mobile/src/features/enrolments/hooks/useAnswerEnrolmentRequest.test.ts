import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { answerEnrolmentRequest } from "../api/answerEnrolmentRequest";
import {
  type ActivityPlaces,
  type ReceivedEnrolmentRequest,
  type ReceivedRequestFilters,
} from "../types";
import { enrolmentKeys } from "./enrolmentKeys";
import { useAnswerEnrolmentRequest } from "./useAnswerEnrolmentRequest";

jest.mock("../api/answerEnrolmentRequest", () => ({
  answerEnrolmentRequest: jest.fn(),
}));

const REQUEST: ReceivedEnrolmentRequest = {
  id: "r1",
  activityId: "a1",
  activityTitle: "Swimming",
  familyProfileName: "Anna",
  familyProfileAge: 8,
  customerEmail: "family@test.com",
  message: null,
  status: "pending",
  createdAt: "2027-07-01T10:00:00Z",
};

const PLACES: ActivityPlaces[] = [
  {
    activityId: "a1",
    activityTitle: "Swimming",
    maxParticipants: 12,
    takenPlaces: 8,
    availablePlaces: 4,
  },
  {
    activityId: "a2",
    activityTitle: "Chess",
    maxParticipants: null,
    takenPlaces: 3,
    availablePlaces: null,
  },
];

const ALL: ReceivedRequestFilters = { activityId: null, status: null };
const SWIMMING: ReceivedRequestFilters = { activityId: "a1", status: null };

async function setup() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(enrolmentKeys.receivedList(ALL), [REQUEST]);
  queryClient.setQueryData(enrolmentKeys.receivedList(SWIMMING), [REQUEST]);
  queryClient.setQueryData(enrolmentKeys.places(), PLACES);
  const invalidate = jest
    .spyOn(queryClient, "invalidateQueries")
    .mockResolvedValue();
  const { result } = await renderHook(() => useAnswerEnrolmentRequest(), {
    wrapper: createQueryClientWrapper(queryClient),
  });
  return { queryClient, invalidate, result };
}

function statuses(
  queryClient: ReturnType<typeof createTestQueryClient>,
  filters: ReceivedRequestFilters,
) {
  return queryClient
    .getQueryData<ReceivedEnrolmentRequest[]>(
      enrolmentKeys.receivedList(filters),
    )
    ?.map((request) => request.status);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useAnswerEnrolmentRequest", () => {
  it("accepts: updates the request in every list and takes a place", async () => {
    jest.mocked(answerEnrolmentRequest).mockResolvedValue();
    const { queryClient, invalidate, result } = await setup();

    await act(async () => {
      await result.current.mutateAsync({
        requestId: "r1",
        activityId: "a1",
        answer: "accept",
      });
    });

    expect(answerEnrolmentRequest).toHaveBeenCalledWith({
      requestId: "r1",
      answer: "accept",
    });
    expect(statuses(queryClient, ALL)).toEqual(["accepted"]);
    expect(statuses(queryClient, SWIMMING)).toEqual(["accepted"]);
    expect(queryClient.getQueryData(enrolmentKeys.places())).toEqual([
      { ...PLACES[0], takenPlaces: 9, availablePlaces: 3 },
      PLACES[1],
    ]);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: enrolmentKeys.received(),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: enrolmentKeys.places(),
    });
  });

  it("rejects: updates the request and leaves the places as they were", async () => {
    jest.mocked(answerEnrolmentRequest).mockResolvedValue();
    const { queryClient, result } = await setup();

    await act(async () => {
      await result.current.mutateAsync({
        requestId: "r1",
        activityId: "a1",
        answer: "reject",
      });
    });

    expect(statuses(queryClient, ALL)).toEqual(["rejected"]);
    expect(queryClient.getQueryData(enrolmentKeys.places())).toEqual(PLACES);
  });

  it("reads everything again when the answer fails", async () => {
    jest
      .mocked(answerEnrolmentRequest)
      .mockRejectedValue(
        new Error("There are no places left in this activity"),
      );
    const { queryClient, invalidate, result } = await setup();

    await act(async () => {
      await result.current
        .mutateAsync({ requestId: "r1", activityId: "a1", answer: "accept" })
        .catch(() => undefined);
    });

    expect(statuses(queryClient, ALL)).toEqual(["pending"]);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: enrolmentKeys.places(),
    });
  });
});
