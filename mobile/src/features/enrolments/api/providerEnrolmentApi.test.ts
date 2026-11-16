import { supabase } from "@/lib/supabase";

import { answerEnrolmentRequest } from "./answerEnrolmentRequest";
import { fetchActivityPlaces } from "./fetchActivityPlaces";
import {
  fetchReceivedEnrolmentRequests,
  RECEIVED_REQUESTS_LIMIT,
} from "./fetchReceivedEnrolmentRequests";
import { type ReceivedEnrolmentRequestRow } from "./toReceivedEnrolmentRequest";

jest.mock("@/lib/supabase", () => ({
  supabase: { rpc: jest.fn() },
}));

type RpcResult = { data: unknown; error: { message: string } | null };

function mockRpc(result: RpcResult) {
  jest
    .mocked(supabase.rpc)
    .mockResolvedValueOnce(
      result as unknown as Awaited<ReturnType<typeof supabase.rpc>>,
    );
}

const ROW: ReceivedEnrolmentRequestRow = {
  id: "r1",
  activity_id: "a1",
  activity_title: "Swimming",
  family_profile_name: "Anna",
  family_profile_age: 8,
  family_profile_age_range: "7-9",
  customer_email: "family@test.com",
  message: "Hello",
  status: "pending",
  created_at: "2027-07-01T10:00:00Z",
  updated_at: "2027-07-01T10:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("fetchReceivedEnrolmentRequests", () => {
  it("asks for every request when there are no filters", async () => {
    mockRpc({ data: [ROW], error: null });

    const result = await fetchReceivedEnrolmentRequests({
      activityId: null,
      status: null,
    });

    expect(supabase.rpc).toHaveBeenCalledWith("provider_enrolment_requests", {
      p_activity_id: undefined,
      p_status: undefined,
      p_limit: RECEIVED_REQUESTS_LIMIT,
    });
    expect(result).toEqual([
      {
        id: "r1",
        activityId: "a1",
        activityTitle: "Swimming",
        familyProfileName: "Anna",
        familyProfileAge: 8,
        familyProfileAgeRange: "7-9",
        customerEmail: "family@test.com",
        message: "Hello",
        status: "pending",
        createdAt: "2027-07-01T10:00:00Z",
      },
    ]);
  });

  it("sends the activity and the status of the filters", async () => {
    mockRpc({ data: [], error: null });

    await fetchReceivedEnrolmentRequests({
      activityId: "a1",
      status: "accepted",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("provider_enrolment_requests", {
      p_activity_id: "a1",
      p_status: "accepted",
      p_limit: RECEIVED_REQUESTS_LIMIT,
    });
  });

  it("keeps the empty age and message as null", async () => {
    mockRpc({
      data: [
        {
          ...ROW,
          family_profile_age: null,
          family_profile_age_range: null,
          message: null,
        },
      ],
      error: null,
    });

    const [request] = await fetchReceivedEnrolmentRequests({
      activityId: null,
      status: null,
    });

    expect(request.familyProfileAge).toBeNull();
    expect(request.familyProfileAgeRange).toBeNull();
    expect(request.message).toBeNull();
  });

  it("fails when the requests cannot be read", async () => {
    mockRpc({ data: null, error: { message: "boom" } });

    await expect(
      fetchReceivedEnrolmentRequests({ activityId: null, status: null }),
    ).rejects.toThrow("boom");
  });
});

describe("fetchActivityPlaces", () => {
  it("returns the places of each activity, with no limit as null", async () => {
    mockRpc({
      data: [
        {
          activity_id: "a1",
          activity_title: "Swimming",
          max_participants: 12,
          taken_places: 8,
          available_places: 4,
        },
        {
          activity_id: "a2",
          activity_title: "Chess",
          max_participants: null,
          taken_places: 3,
          available_places: null,
        },
      ],
      error: null,
    });

    expect(await fetchActivityPlaces()).toEqual([
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
    ]);
    expect(supabase.rpc).toHaveBeenCalledWith("provider_activity_capacities");
  });

  it("fails when the places cannot be read", async () => {
    mockRpc({ data: null, error: { message: "boom" } });

    await expect(fetchActivityPlaces()).rejects.toThrow("boom");
  });
});

describe("answerEnrolmentRequest", () => {
  it("accepts a request", async () => {
    mockRpc({ data: null, error: null });

    await answerEnrolmentRequest({ requestId: "r1", answer: "accept" });

    expect(supabase.rpc).toHaveBeenCalledWith("accept_enrolment_request", {
      p_request_id: "r1",
    });
  });

  it("rejects a request", async () => {
    mockRpc({ data: null, error: null });

    await answerEnrolmentRequest({ requestId: "r1", answer: "reject" });

    expect(supabase.rpc).toHaveBeenCalledWith("reject_enrolment_request", {
      p_request_id: "r1",
    });
  });

  it("fails with the message of the server", async () => {
    mockRpc({
      data: null,
      error: { message: "There are no places left in this activity" },
    });

    await expect(
      answerEnrolmentRequest({ requestId: "r1", answer: "accept" }),
    ).rejects.toThrow("There are no places left in this activity");
  });
});
