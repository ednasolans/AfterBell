// Shared types for AI profile generation (#26).

/** An activity with fixed dates. Dates are ISO text (YYYY-MM-DD). */
export interface TemporaryActivityForPrompt {
  title: string;
  start_date: string | null;
  end_date: string | null;
}

/** Technical sheet fields that are sent to the LLM. Never add contact data here. */
export interface SheetForPrompt {
  name: string;
  provider_type: string;
  activity_types: string[];
  facilities: string[];
  description: string | null; // written by the provider, max 500 chars
  city: string; // comes from the sheet's address (addresses table)
  temporary_activities?: TemporaryActivityForPrompt[]; // comes from the activities table
}

/** Profile returned by the LLM, after validation. */
export interface GeneratedProfile {
  headline: string;
  description: string;
}