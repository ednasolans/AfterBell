import { supabase } from "@/lib/supabase";
import { createQueryBuilderMock } from "@/test-utils/supabaseQueryMock";

import { changeActivityStatus } from "./changeActivityStatus";
import { fetchPublicationIssues } from "./fetchPublicationIssues";

// Replace the real client: tests must not need a database
jest.mock("@/lib/supabase", () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

function mockUpdate(result: Parameters<typeof createQueryBuilderMock>[0]) {
  const builder = createQueryBuilderMock(result);
  jest
    .mocked(supabase.from)
    .mockReturnValue(builder as unknown as ReturnType<typeof supabase.from>);
  return builder;
}

function mockRpc(result: { data: unknown; error: { message: string } | null }) {
  jest
    .mocked(supabase.rpc)
    .mockResolvedValue(
      result as unknown as Awaited<ReturnType<typeof supabase.rpc>>,
    );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("changeActivityStatus", () => {
  it("publishes one activity", async () => {
    const query = mockUpdate({ data: [{ id: "activity-1" }], error: null });

    await changeActivityStatus({ id: "activity-1", status: "published" });

    expect(supabase.from).toHaveBeenCalledWith("activities");
    expect(query.update).toHaveBeenCalledWith({ status: "published" });
    expect(query.eq).toHaveBeenCalledWith("id", "activity-1");
    expect(query.select).toHaveBeenCalledWith("id");
  });

  it("unpublishes one activity", async () => {
    const query = mockUpdate({ data: [{ id: "activity-1" }], error: null });

    await changeActivityStatus({ id: "activity-1", status: "draft" });

    expect(query.update).toHaveBeenCalledWith({ status: "draft" });
  });

  it("throws the database error when something is missing", async () => {
    mockUpdate({
      data: null,
      error: { message: "A complete technical sheet is required to publish" },
    });

    await expect(
      changeActivityStatus({ id: "activity-1", status: "published" }),
    ).rejects.toThrow("A complete technical sheet is required to publish");
  });

  it("throws when no activity was changed", async () => {
    mockUpdate({ data: [], error: null });

    await expect(
      changeActivityStatus({ id: "someone-else", status: "published" }),
    ).rejects.toThrow("The activity does not exist or you cannot change it");
  });
});

describe("fetchPublicationIssues", () => {
  it("returns every missing requirement", async () => {
    mockRpc({ data: ["address", "language"], error: null });

    await expect(fetchPublicationIssues("activity-1")).resolves.toEqual([
      "address",
      "language",
    ]);
    expect(supabase.rpc).toHaveBeenCalledWith("activity_publication_issues", {
      p_activity_id: "activity-1",
    });
  });

  it("returns an empty list when the activity can be published", async () => {
    mockRpc({ data: [], error: null });

    await expect(fetchPublicationIssues("activity-1")).resolves.toEqual([]);
  });

  it("throws for an activity that is not the provider's", async () => {
    mockRpc({ data: null, error: null });

    await expect(fetchPublicationIssues("someone-else")).rejects.toThrow(
      "The activity does not exist or you cannot publish it",
    );
  });

  it("throws the Supabase error", async () => {
    mockRpc({ data: null, error: { message: "permission denied" } });

    await expect(fetchPublicationIssues("activity-1")).rejects.toThrow(
      "permission denied",
    );
  });
});
