import { formatDate, fromIsoDate, toIsoDate } from "./dates";

describe("toIsoDate", () => {
  it("adds a leading zero to the month and the day", () => {
    expect(toIsoDate(new Date(2027, 0, 5))).toBe("2027-01-05");
  });

  it("keeps the local day at midnight", () => {
    expect(toIsoDate(new Date(2027, 6, 1, 0, 0))).toBe("2027-07-01");
  });
});

describe("fromIsoDate", () => {
  it("reads the date in local time", () => {
    const date = fromIsoDate("2027-07-01");

    expect(date.getFullYear()).toBe(2027);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(1);
  });

  it("gives back the same date when converted again", () => {
    expect(toIsoDate(fromIsoDate("2027-12-31"))).toBe("2027-12-31");
  });
});

describe("formatDate", () => {
  it("shows the date in the given locale", () => {
    expect(formatDate("2027-01-05", "en-GB")).toBe("5 Jan 2027");
  });
});
