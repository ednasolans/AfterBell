import { type ActivityCategory } from "@/lib/activityCategories";
import { type Tables } from "@/lib/database.types";
import { type AgeRange } from "@/lib/ages";
import { type PricePeriod } from "@/lib/price";
import { type TimeSlot } from "@/lib/schedule";

export interface Activity {
  id: string;
  providerId: string;
  addressId: string;
  title: string;
  description: string | null;
  category: ActivityCategory;
  type: "whole_year" | "event";
  targetAgeRanges: AgeRange[];
  schedule: TimeSlot[];
  price: number;
  pricePeriod: PricePeriod;
  maxParticipants: number;
  createdAt: string;
}

export type ActivityRow = Tables<"activities">;

export function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    providerId: row.provider_id,
    addressId: row.address_id,
    title: row.title,
    description: row.description,
    category: row.category as ActivityCategory,
    type: row.type as Activity["type"],
    targetAgeRanges: row.target_age_ranges as AgeRange[],
    schedule: row.schedule as unknown as TimeSlot[],
    price: row.price,
    pricePeriod: row.price_period as PricePeriod,
    maxParticipants: row.max_participants,
    createdAt: row.created_at,
  };
}
