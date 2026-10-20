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
  targetAgeRanges: AgeRange[];
  schedule: TimeSlot[];
  priceMin: number | null;
  priceMax: number | null;
  pricePeriod: PricePeriod | null;
  maxParticipants: number | null;
}

export const EMPTY_ACTIVITY_FORM: ActivityForm = {
  title: "",
  description: "",
  category: null,
  targetAgeRanges: [],
  schedule: [],
  priceMin: null,
  priceMax: null,
  pricePeriod: null,
  maxParticipants: null,
};

// A saved activity, as the app uses it after reading it from the database
export interface Activity {
  id: string;
  providerId: string;
  title: string;
  description: string | null;
  category: ActivityCategory;
  type: ActivityType;
  targetAgeRanges: AgeRange[];
  schedule: TimeSlot[];
  priceMin: number;
  priceMax: number;
  pricePeriod: PricePeriod;
  maxParticipants: number;
  createdAt: string;
}
