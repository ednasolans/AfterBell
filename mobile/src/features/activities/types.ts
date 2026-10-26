import { type Activity } from "@/lib/activity";
import { type ActivityCategory } from "@/lib/activityCategories";
import { type AgeRange } from "@/lib/ages";
import { type PricePeriod } from "@/lib/price";
import { type TimeSlot } from "@/lib/schedule";

export const ACTIVITY_TYPES = ["whole_year", "event"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// What the user fills in: null means "not chosen yet"
export interface ActivityForm {
  title: string;
  description: string;
  category: ActivityCategory | null;
  type: ActivityType;
  targetAgeRanges: AgeRange[];
  schedule: TimeSlot[];
  price: number | null;
  pricePeriod: PricePeriod | null;
  maxParticipants: number | null;
  // One of the addresses of the provider, entered in its technical sheet
  addressId: string | null;
}

export const EMPTY_ACTIVITY_FORM: ActivityForm = {
  title: "",
  description: "",
  category: null,
  type: "whole_year",
  targetAgeRanges: [],
  schedule: [],
  price: null,
  pricePeriod: null,
  maxParticipants: null,
  addressId: null,
};

// A saved activity, as the app uses it after reading it from the database
export type { Activity };
