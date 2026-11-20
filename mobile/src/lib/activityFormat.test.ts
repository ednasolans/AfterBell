import { formatDate } from "@/lib/dates";

import {
  formatAgeRange,
  formatAgeSummary,
  formatDateRange,
  formatPrice,
  formatScheduleSummary,
} from "./activityFormat";

describe("formatAgeRange", () => {
  it("shows the youngest and the oldest age", () => {
    expect(formatAgeRange(7, 12)).toBe("7–12 years");
  });
});

describe("formatPrice", () => {
  it("shows the price in euros", () => {
    expect(formatPrice(15)).toBe("15 €");
  });

  it("says when the activity is free", () => {
    expect(formatPrice(0)).toBe("Free");
  });
});

describe("formatDateRange", () => {
  it("shows both dates", () => {
    expect(formatDateRange("2026-10-01", "2026-12-31")).toBe(
      `${formatDate("2026-10-01")} – ${formatDate("2026-12-31")}`,
    );
  });

  it("shows only the start date", () => {
    expect(formatDateRange("2026-10-01", null)).toBe(
      `From ${formatDate("2026-10-01")}`,
    );
  });

  it("shows only the end date", () => {
    expect(formatDateRange(null, "2026-12-31")).toBe(
      `Until ${formatDate("2026-12-31")}`,
    );
  });

  it("returns null without dates", () => {
    expect(formatDateRange(null, null)).toBeNull();
  });
});

describe("formatAgeSummary", () => {
  it.each([
    [["7-9", "10-12"], "Ages 7–12"],
    [["10-12", "7-9"], "Ages 7–12"],
    [["4-6", "13-15"], "Ages 4–6, 13–15"],
    [["16-17", "adult"], "Ages 16+"],
    [["adult"], "Adults"],
    [["0-3"], "Ages 0–3"],
    [["all_publics", "7-9"], "All ages"],
  ])("summarises %j as %s", (ranges, summary) => {
    expect(formatAgeSummary(ranges)).toBe(summary);
  });

  it("is null without known ranges", () => {
    expect(formatAgeSummary([])).toBeNull();
    expect(formatAgeSummary(["unknown"])).toBeNull();
  });
});

describe("formatScheduleSummary", () => {
  const slot = (
    day: "monday" | "wednesday" | "friday",
    startTime = "17:00",
  ) => ({
    day,
    startTime,
    endTime: "18:00",
  });

  it("is null without slots", () => {
    expect(formatScheduleSummary([])).toBeNull();
  });

  it("shows one day with its time", () => {
    expect(formatScheduleSummary([slot("monday")])).toBe("Mon, 17:00");
  });

  it("joins the days in week order, with the shared time", () => {
    expect(formatScheduleSummary([slot("wednesday"), slot("monday")])).toBe(
      "Mon & Wed, 17:00",
    );
    expect(
      formatScheduleSummary([
        slot("friday"),
        slot("monday"),
        slot("wednesday"),
      ]),
    ).toBe("Mon, Wed & Fri, 17:00");
  });

  it("leaves out the time when the slots start at different times", () => {
    expect(
      formatScheduleSummary([slot("monday"), slot("wednesday", "18:00")]),
    ).toBe("Mon & Wed");
  });

  it("names a day once even with several slots", () => {
    expect(
      formatScheduleSummary([slot("monday"), slot("monday", "19:00")]),
    ).toBe("Mon");
  });
});
