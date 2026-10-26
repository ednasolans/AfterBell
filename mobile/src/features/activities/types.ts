import { type ActivityCategory } from "@/lib/activityCategories";
import { type AgeRange } from "@/lib/ages";
import { type PricePeriod } from "@/lib/price";
import { type TimeSlot } from "@/lib/schedule";

export const ACTIVITY_TYPES = ["whole_year", "event"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_STATUSES = ["draft", "published"] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];
export const PUBLISHED_ACTIVITY_STATUS: ActivityStatus = "published";


// What the user fills in: null means "not chosen yet"
export interface ActivityForm {
  title: string;
  description: string;
  minAge: number | null;
  maxAge: number | null;
  schedule: string[];
  price: number | null;
  startDate: string; // "YYYY-MM-DD", or "" when there is none
  endDate: string;
  // One of the addresses of the provider, entered in its technical sheet
  addressId: string | null;
  status: ActivityStatus;
}

export const EMPTY_ACTIVITY_FORM: ActivityForm = {
  title: "",
  description: "",
  minAge: null,
  maxAge: null,
  schedule: [],
  price: null,
  startDate: "",
  endDate: "",
  addressId: null,
  status: "draft",
};

// A saved activity, as the app uses it after reading it from the database
export interface Activity {
  id: string;
  accountId: string;
  providerProfileId: string | null;
  addressId: string | null;
  title: string;
  description: string | null;
  minAge: number;
  maxAge: number;
  schedule: string[];
  price: number; // euros
  startDate: string | null; // "YYYY-MM-DD"
  endDate: string | null;
  status: ActivityStatus;
  createdAt: string;
  updatedAt: string;
}
