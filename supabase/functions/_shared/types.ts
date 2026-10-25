// Shared types for AI profile generation (#26).

/** Technical sheet fields that are sent to the LLM. Never add contact data here. */
export interface SheetForPrompt {
  name: string;
  provider_type: string;
  activity_types: string[];
  facilities: string[];
  description: string | null; // written by the provider, max 500 chars
  city: string; // comes from the sheet's address (addresses table)
}

/** Profile returned by the LLM, after validation. */
export interface GeneratedProfile {
  headline: string;
  description: string;
}