// Supabase implementation of ProfileRepository (#30).
// It uses the caller's session, never the service role key,
// so every query is also filtered by the RLS policies.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { GeneratedProfile, SheetForPrompt } from "../_shared/types.ts";
import type { ExistingProfile, ProfileRepository, SavedDraft } from "./handler.ts";

// Only the fields the LLM may see. Contact data is never read.
const SHEET_FIELDS =
  "name, provider_type, activity_types, facilities, description, addresses!technical_sheets_address_fkey(city)";

interface SheetRow {
  name: string;
  provider_type: string;
  activity_types: string[];
  facilities: string[];
  description: string | null;
  addresses: { city: string } | null;
}

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient, private readonly accessToken: string) {}

  async getUserId(): Promise<string | null> {
    const { data, error } = await this.client.auth.getUser(this.accessToken);
    return error ? null : data.user?.id ?? null;
  }

  async isCompany(): Promise<boolean> {
    const { data, error } = await this.client.rpc("is_company");
    if (error) throw new Error(`is_company failed: ${error.message}`);
    return data === true;
  }

  async getSheet(userId: string): Promise<SheetForPrompt | null> {
    // One sheet per provider is expected; the newest one is used just in case.
    const { data, error } = await this.client
      .from("technical_sheets")
      .select(SHEET_FIELDS)
      .eq("provider_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<SheetRow>();
    if (error) throw new Error(`technical_sheets query failed: ${error.message}`);
    if (!data?.addresses) return null;

    return {
      name: data.name,
      provider_type: data.provider_type,
      activity_types: data.activity_types,
      facilities: data.facilities,
      description: data.description,
      city: data.addresses.city,
    };
  }

  async getProfile(userId: string): Promise<ExistingProfile | null> {
    const { data, error } = await this.client
      .from("provider_profiles")
      .select("status, generated_at")
      .eq("provider_id", userId)
      .maybeSingle<{ status: string; generated_at: string }>();
    if (error) throw new Error(`provider_profiles query failed: ${error.message}`);
    return data ? { status: data.status, generatedAt: new Date(data.generated_at) } : null;
  }

  async saveDraft(profile: GeneratedProfile, model: string): Promise<SavedDraft> {
    // provider_id is not sent: the column defaults to auth.uid().
    // A previous draft of the same provider is overwritten.
    const { data, error } = await this.client
      .from("provider_profiles")
      .upsert(
        {
          headline: profile.headline,
          description: profile.description,
          status: "draft",
          model,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "provider_id" },
      )
      .select("headline, description, status, model, generated_at")
      .single<SavedDraft>();
    if (error) throw new Error(`saving the draft failed: ${error.message}`);
    return data;
  }
}