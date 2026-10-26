import { type Activity } from "@/features/activities/types";

// A saved activity to use in tests; spread it to change only what a test needs
export const ACTIVITY: Activity = {
  id: "activity-1",
  accountId: "provider-1",
  providerProfileId: "profile-1",
  addressId: "address-1",
  title: "Swimming for kids",
  description: "Small groups",
  minAge: 7,
  maxAge: 12,
  schedule: ["Tuesday 17:00-18:00"],
  price: 30,
  startDate: "2026-10-01",
  endDate: "2026-12-31",
  status: "published",
  createdAt: "2026-10-20T08:00:00Z",
  updatedAt: "2026-10-20T08:00:00Z",
};