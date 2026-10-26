import { type Activity } from "../types";
import { toActivity, toActivityForm, type ActivityRow } from "./toActivity";

const ROW: ActivityRow = {
  id: "activity-1",
  account_id: "provider-1",
  provider_profile_id: "profile-1",
  address_id: "address-1",
  title: "Swimming for kids",
  description: null,
  min_age: 7,
  max_age: 12,
  schedule: ["Tuesday 17:00-18:00"],
  price: 30,
  start_date: "2026-10-01",
  end_date: null,
  status: "published",
  created_at: "2026-10-20T08:00:00Z",
  updated_at: "2026-10-20T08:00:00Z",
};

const ACTIVITY: Activity = {
  id: "activity-1",
  accountId: "provider-1",
  providerProfileId: "profile-1",
  addressId: "address-1",
  title: "Swimming for kids",
  description: null,
  minAge: 7,
  maxAge: 12,
  schedule: ["Tuesday 17:00-18:00"],
  price: 30,
  startDate: "2026-10-01",
  endDate: null,
  status: "published",
  createdAt: "2026-10-20T08:00:00Z",
  updatedAt: "2026-10-20T08:00:00Z",
};

describe("toActivity", () => {
  it("converts every column to its field", () => {
    expect(toActivity(ROW)).toEqual(ACTIVITY);
  });
});

describe("toActivityForm", () => {
  it("keeps only the fields of the form", () => {
    expect(toActivityForm(ACTIVITY)).toEqual({
      title: "Swimming for kids",
      description: "",
      minAge: 7,
      maxAge: 12,
      schedule: ["Tuesday 17:00-18:00"],
      price: 30,
      startDate: "2026-10-01",
      endDate: "",
      addressId: "address-1",
      status: "published",
});
  });

  it("keeps a description that has text", () => {
    const form = toActivityForm({ ...ACTIVITY, description: "Small groups" });
    expect(form.description).toBe("Small groups");
  });
});
