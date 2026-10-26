import { supabase } from "@/lib/supabase";
import { createQueryBuilderMock } from "@/test-utils/supabaseQueryMock";

import { fetchMyProfile } from "./fetchMyProfile";
import {
  DEFAULT_GENERATE_ERROR,
  generateErrorMessage,
  generateProfile,
} from "./generateProfile";
import { hasTechnicalSheet } from "./hasTechnicalSheet";
import { approveProfile, saveProfile } from "./updateMyProfile";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
    functions: { invoke: jest.fn() },
  },
}));

const ROW = {
  id: "profile-1",
  provider_id: "provider-1",
  headline: "Music lessons in Lleida",
  description: "A music school.",
  status: "draft",
  model: "gemini-3.5-flash-lite",
  generated_at: "2026-10-24T10:00:00Z",
  approved_at: null,
};

function loggedIn() {
  jest
    .mocked(supabase.auth.getUser)
    .mockResolvedValue({ data: { user: { id: "provider-1" } } } as never);
}

function queryReturns(result: {
  data: unknown;
  error: { message: string } | null;
}) {
  const builder = createQueryBuilderMock(result);
  jest.mocked(supabase.from).mockReturnValue(builder as never);
  return builder;
}

beforeEach(() => {
  jest.clearAllMocks();
  loggedIn();
});

describe("fetchMyProfile", () => {
  it("returns the profile of the logged-in provider", async () => {
    const builder = queryReturns({ data: [ROW], error: null });
    await expect(fetchMyProfile()).resolves.toEqual({
      headline: "Music lessons in Lleida",
      description: "A music school.",
      status: "draft",
      generatedAt: "2026-10-24T10:00:00Z",
      approvedAt: null,
    });
    expect(builder.eq).toHaveBeenCalledWith("provider_id", "provider-1");
  });

  it("returns null when there is no profile yet", async () => {
    queryReturns({ data: [], error: null });
    await expect(fetchMyProfile()).resolves.toBeNull();
  });

  it("throws when the query fails", async () => {
    queryReturns({ data: null, error: { message: "Network error" } });
    await expect(fetchMyProfile()).rejects.toThrow("Network error");
  });

  it("throws when there is no session", async () => {
    jest
      .mocked(supabase.auth.getUser)
      .mockResolvedValue({ data: { user: null } } as never);
    await expect(fetchMyProfile()).rejects.toThrow("You must be logged in");
  });
});

describe("hasTechnicalSheet", () => {
  it("is true when the provider has a sheet", async () => {
    queryReturns({ data: [{ id: "sheet-1" }], error: null });
    await expect(hasTechnicalSheet()).resolves.toBe(true);
  });

  it("is false when the provider has no sheet", async () => {
    queryReturns({ data: [], error: null });
    await expect(hasTechnicalSheet()).resolves.toBe(false);
  });

  it("throws when the query fails", async () => {
    queryReturns({ data: null, error: { message: "Network error" } });
    await expect(hasTechnicalSheet()).rejects.toThrow("Network error");
  });
});

describe("saveProfile", () => {
  it("saves the trimmed texts of the draft", async () => {
    const builder = queryReturns({ data: [{ id: "profile-1" }], error: null });
    await saveProfile({
      headline: " New headline ",
      description: " New text ",
    });
    expect(builder.update).toHaveBeenCalledWith({
      headline: "New headline",
      description: "New text",
    });
    expect(builder.eq).toHaveBeenCalledWith("status", "draft");
  });

  it("throws when no draft was changed", async () => {
    queryReturns({ data: [], error: null });
    await expect(
      saveProfile({ headline: "h", description: "d" }),
    ).rejects.toThrow("You do not have a draft profile to change");
  });

  it("throws when the update fails", async () => {
    queryReturns({ data: null, error: { message: "Network error" } });
    await expect(
      saveProfile({ headline: "h", description: "d" }),
    ).rejects.toThrow("Network error");
  });
});

describe("approveProfile", () => {
  it("only changes the status of the draft", async () => {
    const builder = queryReturns({ data: [{ id: "profile-1" }], error: null });
    await approveProfile();
    expect(builder.update).toHaveBeenCalledWith({ status: "approved" });
  });
});

describe("generateProfile", () => {
  it("calls the generate-profile function", async () => {
    jest.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { profile: {} },
      error: null,
    } as never);
    await generateProfile();
    expect(supabase.functions.invoke).toHaveBeenCalledWith("generate-profile");
  });

  it("turns the error code of the function into a message", async () => {
    const error = {
      context: {
        json: () => Promise.resolve({ error: { code: "llm_timeout" } }),
      },
    };
    jest
      .mocked(supabase.functions.invoke)
      .mockResolvedValue({ data: null, error } as never);
    await expect(generateProfile()).rejects.toThrow(
      "The AI took too long to answer. Please try again.",
    );
  });

  it("uses a default message when the error has no code", async () => {
    jest
      .mocked(supabase.functions.invoke)
      .mockResolvedValue({ data: null, error: new Error("Failed") } as never);
    await expect(generateProfile()).rejects.toThrow(DEFAULT_GENERATE_ERROR);
  });

  it("uses a default message when the error body is not JSON", async () => {
    const error = { context: { json: () => Promise.reject(new Error("bad")) } };
    jest
      .mocked(supabase.functions.invoke)
      .mockResolvedValue({ data: null, error } as never);
    await expect(generateProfile()).rejects.toThrow(DEFAULT_GENERATE_ERROR);
  });
});

describe("generateErrorMessage", () => {
  it("uses a default message for unknown codes", () => {
    expect(generateErrorMessage("something_new")).toBe(DEFAULT_GENERATE_ERROR);
  });
});
