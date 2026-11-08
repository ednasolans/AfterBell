import { type Activity } from "@/lib/activity";
import { type AgeRange } from "@/lib/ages";
import { type PricePeriod } from "@/lib/price";
import { type TimeSlot } from "@/lib/schedule";

export const ACTIVITY_TYPES = ["whole_year", "event", "temporary"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// `event` is not offered: events are their own entity (#91)
export const SELECTABLE_ACTIVITY_TYPES = ["whole_year", "temporary"] as const;

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  whole_year: "Whole year",
  temporary: "Temporary",
  event: "Event",
};

// What the user fills in: null means "not chosen yet"
export interface ActivityForm {
  title: string;
  description: string;
  category: string | null;
  type: ActivityType;
  // ISO dates (YYYY-MM-DD)
  startDate: string | null;
  endDate: string | null;
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
  startDate: null,
  endDate: null,
  targetAgeRanges: [],
  schedule: [],
  price: null,
  pricePeriod: null,
  maxParticipants: null,
  addressId: null,
};

// A saved activity, as the app uses it after reading it from the database
export type { Activity };

// Codes returned by the database function activity_publication_issues (#87):
// one per requirement that is still missing to publish an activity
export const PUBLICATION_ISSUES = [
  "technical_sheet",
  "address",
  "dates",
  "language",
] as const;
export type PublicationIssue = (typeof PUBLICATION_ISSUES)[number];

// What the provider must do to fix each issue
export const PUBLICATION_ISSUE_LABELS: Record<PublicationIssue, string> = {
  technical_sheet:
    "Complete your technical sheet with a name and an email or phone number.",
  address:
    "Use an address with street, number, postal code, city, province and country.",
  dates: "Add a start date and an end date, and the end must not be earlier.",
  language: "Add at least one language and level.",
};
