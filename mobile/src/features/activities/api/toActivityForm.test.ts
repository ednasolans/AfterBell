import { ACTIVITY } from "@/test-utils/activityFixtures";

import { toActivityForm } from "./toActivityForm";

describe("toActivityForm", () => {
  it("keeps the maximum of an activity with a limit", () => {
    const form = toActivityForm({ ...ACTIVITY, maxParticipants: 12 });

    expect(form.maxParticipants).toBe(12);
    expect(form.unlimitedParticipants).toBe(false);
  });

  it("opens an activity without maximum as no limit", () => {
    const form = toActivityForm({ ...ACTIVITY, maxParticipants: null });

    expect(form.maxParticipants).toBeNull();
    expect(form.unlimitedParticipants).toBe(true);
  });
});
