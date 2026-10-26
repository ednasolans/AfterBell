import { type ActivityForm } from "../types";
import { toActivityInsert } from "./toActivityInsert";

const VALID_FORM: ActivityForm = {
  title: "  Swimming for kids ",
  description: "   ",
  minAge: 7,
  maxAge: 12,
  schedule: [" Tuesday 17:00-18:00 "],
  price: 30,
  startDate: "2026-10-01",
  endDate: "  ",
  addressId: "address-1",
  status: "published",
};

describe("toActivityInsert", () => {
  it("converts every field to its database column", () => {
    expect(toActivityInsert(VALID_FORM)).toEqual({
      title: "Swimming for kids",
      description: null,
      min_age: 7,
      max_age: 12,
      schedule: ["Tuesday 17:00-18:00"],
      price: 30,
      start_date: "2026-10-01",
      end_date: null,
      address_id: "address-1",
      status: "published",
    });
  });

  it("does not send account_id, so the database fills it", () => {
    const row = toActivityInsert(VALID_FORM);
    expect(row).not.toHaveProperty("account_id");
  });

  it("keeps a description that has text, without surrounding spaces", () => {
    const row = toActivityInsert({
      ...VALID_FORM,
      description: " Small groups ",
    });
    expect(row.description).toBe("Small groups");
  });

  it("drops the empty lines of the schedule", () => {
    const row = toActivityInsert({
      ...VALID_FORM,
      schedule: ["Monday 17:00-18:00", "  ", "", " Friday 10:00-11:30"],
    });
    expect(row.schedule).toEqual(["Monday 17:00-18:00", "Friday 10:00-11:30"]);
  });

  it("sends the status chosen in the form", () => {
    const row = toActivityInsert({ ...VALID_FORM, status: "draft" });
    expect(row.status).toBe("draft");
  });

  it("saves both dates when they are given", () => {
    const row = toActivityInsert({ ...VALID_FORM, endDate: "2026-12-31" });
    expect(row.start_date).toBe("2026-10-01");
    expect(row.end_date).toBe("2026-12-31");
  });

  it.each<Partial<ActivityForm>>([
    { minAge: null },
    { maxAge: null },
    { price: null },
    { addressId: null },
  ])("throws if the activity was not validated (%o)", (changes) => {
    expect(() => toActivityInsert({ ...VALID_FORM, ...changes })).toThrow();
  });
});