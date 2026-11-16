import { supabase } from "@/lib/supabase";
import { createQueryBuilderMock } from "@/test-utils/supabaseQueryMock";

import { cancelEnrolmentRequest } from "./cancelEnrolmentRequest";
import { fetchEnrolmentProfiles } from "./fetchEnrolmentProfiles";
import {
  fetchMyEnrolmentRequests,
  MY_REQUESTS_LIMIT,
} from "./fetchMyEnrolmentRequests";
import { sendEnrolmentRequests } from "./sendEnrolmentRequests";
import { type EnrolmentRequestRow } from "./toEnrolmentRequest";

jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

type RpcResult = { data: unknown; error: { message: string } | null };

function mockRpc(...results: RpcResult[]) {
  const mocked = jest.mocked(supabase.rpc);
  for (const result of results) {
    mocked.mockResolvedValueOnce(
      result as unknown as Awaited<ReturnType<typeof supabase.rpc>>,
    );
  }
}

const ROW: EnrolmentRequestRow = {
  id: "r1",
  activity_id: "a1",
  activity_title: "Swimming",
  activity_available: true,
  family_profile_id: "anna",
  family_profile_name: "Anna",
  message: "Hello",
  status: "accepted",
  created_at: "2027-07-01T10:00:00Z",
  updated_at: "2027-07-02T10:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("fetchEnrolmentProfiles", () => {
  it("returns the family profiles, oldest first", async () => {
    const query = createQueryBuilderMock({
      data: [{ id: "anna", first_name: "Anna" }],
      error: null,
    });
    jest
      .mocked(supabase.from)
      .mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

    await expect(fetchEnrolmentProfiles()).resolves.toEqual([
      { id: "anna", firstName: "Anna" },
    ]);
    expect(supabase.from).toHaveBeenCalledWith("family_profiles");
    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  it("throws when the database returns an error", async () => {
    const query = createQueryBuilderMock({
      data: null,
      error: { message: "Database error" },
    });
    jest
      .mocked(supabase.from)
      .mockReturnValue(query as unknown as ReturnType<typeof supabase.from>);

    await expect(fetchEnrolmentProfiles()).rejects.toThrow("Database error");
  });
});

describe("fetchMyEnrolmentRequests", () => {
  it("maps the requests of the family", async () => {
    mockRpc({ data: [ROW], error: null });

    await expect(fetchMyEnrolmentRequests()).resolves.toEqual([
      {
        id: "r1",
        activityId: "a1",
        activityTitle: "Swimming",
        activityAvailable: true,
        familyProfileId: "anna",
        familyProfileName: "Anna",
        message: "Hello",
        status: "accepted",
        createdAt: "2027-07-01T10:00:00Z",
      },
    ]);
    expect(supabase.rpc).toHaveBeenCalledWith("my_enrolment_requests", {
      p_limit: MY_REQUESTS_LIMIT,
    });
  });

  it("throws when the function fails", async () => {
    mockRpc({ data: null, error: { message: "boom" } });

    await expect(fetchMyEnrolmentRequests()).rejects.toThrow("boom");
  });
});

describe("sendEnrolmentRequests", () => {
  it("sends one request per profile, with the trimmed message", async () => {
    mockRpc({ data: "r1", error: null }, { data: "r2", error: null });

    await sendEnrolmentRequests({
      activityId: "a1",
      form: { profileIds: ["anna", "pau"], message: " Hi " },
    });

    expect(supabase.rpc).toHaveBeenNthCalledWith(1, "send_enrolment_request", {
      p_activity_id: "a1",
      p_family_profile_id: "anna",
      p_message: "Hi",
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, "send_enrolment_request", {
      p_activity_id: "a1",
      p_family_profile_id: "pau",
      p_message: "Hi",
    });
  });

  it("sends no message when it is empty", async () => {
    mockRpc({ data: "r1", error: null });

    await sendEnrolmentRequests({
      activityId: "a1",
      form: { profileIds: ["anna"], message: "   " },
    });

    expect(supabase.rpc).toHaveBeenCalledWith("send_enrolment_request", {
      p_activity_id: "a1",
      p_family_profile_id: "anna",
      p_message: undefined,
    });
  });

  it("stops at the first error and keeps the requests sent before", async () => {
    mockRpc(
      { data: "r1", error: null },
      { data: null, error: { message: "This activity is full" } },
    );

    await expect(
      sendEnrolmentRequests({
        activityId: "a1",
        form: { profileIds: ["anna", "pau", "marc"], message: "" },
      }),
    ).rejects.toThrow("This activity is full");
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
  });
});

describe("cancelEnrolmentRequest", () => {
  it("cancels the request", async () => {
    mockRpc({ data: null, error: null });

    await cancelEnrolmentRequest("r1");

    expect(supabase.rpc).toHaveBeenCalledWith("cancel_enrolment_request", {
      p_request_id: "r1",
    });
  });

  it("throws when the function rejects it", async () => {
    mockRpc({ data: null, error: { message: "Not the requesting customer" } });

    await expect(cancelEnrolmentRequest("r1")).rejects.toThrow(
      "Not the requesting customer",
    );
  });
});
