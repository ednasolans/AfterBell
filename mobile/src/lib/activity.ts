import { type Tables } from "@/lib/database.types";
import { type ActivityStatus } from "@/lib/activityStatus";
import { type AgeRange } from "@/lib/ages";
import { type PricePeriod } from "@/lib/price";
import { type TimeSlot } from "@/lib/schedule";

import { toIsoDate } from "./dates";

export type LanguagePair = { language: string; level: string };

export interface Activity {
  id: string;
  providerId: string;
  addressId: string;
  title: string;
  description: string | null;
  category: string;
  isTutor: boolean;
  languages: LanguagePair[];
  type: "whole_year" | "event" | "temporary";
  // Only activities with dates have them: never whole-year ones
  startDate: string | null;
  endDate: string | null;
  targetAgeRanges: AgeRange[];
  schedule: TimeSlot[];
  price: number;
  pricePeriod: PricePeriod;
  // Null only when the provider chose "no limit"
  maxParticipants: number | null;
  status: ActivityStatus; // Only published activities are visible to customers
  createdAt: string;
}

export type ActivityRow = Tables<"activities">;

export function toActivity(
  row: ActivityRow & { languages?: LanguagePair[] },
): Activity {
  return {
    id: row.id,
    providerId: row.provider_id,
    addressId: row.address_id,
    title: row.title,
    description: row.description,
    category: row.category,
    isTutor: row.is_tutor,
    languages: (row.languages ?? [])
      .map(({ language, level }) => ({ language, level }))
      .sort(
        (a, b) =>
          a.language.localeCompare(b.language) ||
          a.level.localeCompare(b.level),
      ),
    type: row.type as Activity["type"],
    startDate: row.start_date,
    endDate: row.end_date,
    targetAgeRanges: row.target_age_ranges as AgeRange[],
    // Only activities with dates can be saved without a schedule
    schedule: (row.schedule ?? []) as unknown as TimeSlot[],
    price: row.price,
    pricePeriod: row.price_period as PricePeriod,
    maxParticipants: row.max_participants,
    status: row.status as ActivityStatus,
    createdAt: row.created_at,
  };
}

// An activity is still on during its last day. ISO dates compare as text.
export function isFinished(
  { endDate }: Pick<Activity, "endDate">,
  today: string = toIsoDate(new Date()),
): boolean {
  return endDate !== null && endDate < today;
}
