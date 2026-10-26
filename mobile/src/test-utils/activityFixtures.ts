import { type Activity } from "@/lib/activity";

// A saved activity to use in tests; spread it to change only what a test needs
export const ACTIVITY: Activity = {
  id: "activity-1",
  providerId: "provider-1",
  addressId: "address-1",
  title: "Swimming for kids",
  description: "Small groups",
  category: "swimming",
  type: "whole_year",
  targetAgeRanges: ["7-9", "10-12"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  price: 30,
  pricePeriod: "per_month",
  maxParticipants: 12,
  createdAt: "2026-10-20T08:00:00Z",
};
