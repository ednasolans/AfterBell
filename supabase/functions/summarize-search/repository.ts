// Supabase implementations for summarize-search (#112, #114).

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { SearchFilters } from "../_shared/searchSummary.ts";
import type { RateLimiter, SearchResult, SummaryCache, SummaryRepository } from "./handler.ts";

interface ActivityRow {
  id: string;
  address_id: string;
  title: string;
  category: string;
  target_age_ranges: string[];
  price: number;
  price_period: string;
}

/**
 * Runs the search with the caller's session, never the service role key:
 * search_activities and RLS return only published activities.
 */
export class SupabaseSummaryRepository implements SummaryRepository {
  constructor(private readonly client: SupabaseClient, private readonly accessToken: string) {}

  async getUserId(): Promise<string | null> {
    const { data, error } = await this.client.auth.getUser(this.accessToken);
    return error ? null : data.user?.id ?? null;
  }

  async search(filters: SearchFilters, limit: number): Promise<SearchResult[]> {
    const { data, error } = await this.client.rpc("search_activities", {
      p_query: filters.query,
      p_category: filters.category,
      p_city: filters.city,
      p_price_min: filters.priceMin,
      p_price_max: filters.priceMax,
      p_limit: limit,
      p_offset: 0,
    });
    if (error) throw new Error(`search_activities failed: ${error.message}`);
    const activities = (data ?? []) as ActivityRow[];
    if (activities.length === 0) return [];

    // The city of each activity comes from its address
    const addressIds = [...new Set(activities.map((activity) => activity.address_id))];
    const { data: addresses, error: addressError } = await this.client
      .from("addresses")
      .select("id, city")
      .in("id", addressIds);
    if (addressError) throw new Error(`addresses query failed: ${addressError.message}`);
    const cityById = new Map((addresses ?? []).map((address) => [address.id, address.city]));

    return activities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      category: activity.category,
      target_age_ranges: activity.target_age_ranges,
      city: cityById.get(activity.address_id) ?? "",
      price: activity.price,
      price_period: activity.price_period,
    }));
  }
}

/**
 * Cache and rate limit, with the service role key. Only these two tables use
 * it: a user who could write the shared cache could show a fake summary to
 * other users.
 */
export class SupabaseSummaryStore implements SummaryCache, RateLimiter {
  constructor(
    private readonly admin: SupabaseClient,
    private readonly maxRequests: number,
    private readonly windowMinutes: number,
  ) {}

  async get(key: string): Promise<string | null> {
    const { data, error } = await this.admin
      .from("search_summary_cache")
      .select("summary")
      .eq("cache_key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle<{ summary: string }>();
    if (error) throw new Error(`cache read failed: ${error.message}`);
    return data?.summary ?? null;
  }

  async set(key: string, summary: string, expiresAt: Date): Promise<void> {
    const { error } = await this.admin
      .from("search_summary_cache")
      .upsert(
        { cache_key: key, summary, created_at: new Date().toISOString(), expires_at: expiresAt.toISOString() },
        { onConflict: "cache_key" },
      );
    if (error) throw new Error(`cache write failed: ${error.message}`);
  }

  async allow(userId: string): Promise<boolean> {
    const { data, error } = await this.admin.rpc("register_search_summary_request", {
      p_user_id: userId,
      p_max_requests: this.maxRequests,
      p_window_minutes: this.windowMinutes,
    });
    if (error) throw new Error(`rate limit failed: ${error.message}`);
    return data === true;
  }
}