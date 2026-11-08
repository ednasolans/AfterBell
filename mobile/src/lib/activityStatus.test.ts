import {
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_STATUSES,
} from "@/lib/activityStatus";

describe("activity statuses", () => {
  it("match the values of the database CHECK constraint", () => {
    expect(ACTIVITY_STATUSES).toEqual(["draft", "published"]);
  });

  it("have a label for every status", () => {
    expect(ACTIVITY_STATUS_LABELS).toEqual({
      draft: "Draft",
      published: "Published",
    });
  });
});