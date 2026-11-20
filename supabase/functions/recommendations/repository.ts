// Supabase implementation for recommendations (#107).

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  type ActivityRow,
  HttpError,
  type RecommendationRow,
  type RecommendationsRepository,
  type RecommendOutcome,
} from "./handler.ts";

// SQLSTATE of recommendations_not_a_customer
const INSUFFICIENT_PRIVILEGE = "42501";

// The errors of recommend_activities() that mean "the customer must add data"
const MISSING_DATA = {
  recommendations_no_city: "NO_CITY",
  recommendations_no_profiles: "NO_PROFILES",
  recommendations_incomplete_profiles: "INCOMPLETE_PROFILES",
} as const;

/**
 * Runs everything with the caller's session, never the service role key:
 * recommend_activities() always uses the family of the logged-in account and
 * RLS applies to the activities.
 */
export class SupabaseRecommendationsRepository implements RecommendationsRepository {
  constructor(private readonly client: SupabaseClient, private readonly accessToken: string) {}

  async getUserId(): Promise<string | null> {
    const { data, error } = await this.client.auth.getUser(this.accessToken);
    return error ? null : data.user?.id ?? null;
  }

  async recommend(limit: number, offset: number, profileId: string | null): Promise<RecommendOutcome> {
    const { data, error } = await this.client.rpc("recommend_activities", {
      p_limit: limit,
      p_offset: offset,
      p_profile_id: profileId,
    });
    if (error?.code === INSUFFICIENT_PRIVILEGE) {
      throw new HttpError(403, "forbidden", "Only customers have recommendations");
    }
    const status = error ? MISSING_DATA[error.message as keyof typeof MISSING_DATA] : undefined;
    if (status) return { kind: "missing", status };
    if (error) throw new Error(`recommend_activities failed: ${error.message}`);
    return { kind: "rows", rows: (data ?? []) as RecommendationRow[] };
  }

  async fetchActivities(ids: string[]): Promise<ActivityRow[]> {
    const { data, error } = await this.client.from("activities").select("*").in("id", ids);
    if (error) throw new Error(`activities query failed: ${error.message}`);
    return (data ?? []) as ActivityRow[];
  }
}
