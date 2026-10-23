// Validation of the LLM output for the provider profile (#28).

import { DESCRIPTION_MAX_WORDS, DESCRIPTION_MIN_WORDS } from "./prompts.ts";
import type { GeneratedProfile } from "./types.ts";

// Models rarely hit an exact word count, so we accept a small margin.
// The provider reviews the draft anyway.
const WORD_MARGIN = 0.15;
// Hard limits, the same as the CHECK constraints of provider_profiles (#29).
const HEADLINE_HARD_LIMIT = 120;
const DESCRIPTION_HARD_LIMIT = 2000;

export class ProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileValidationError";
  }
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Removes ```json fences that some models add. */
function stripCodeFence(raw: string): string {
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(raw.trim());
  return match ? match[1] : raw.trim();
}

function requireText(obj: Record<string, unknown>, key: string, maxChars: number): string {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ProfileValidationError(`"${key}" must be a non-empty string`);
  }
  if (value.length > maxChars) {
    throw new ProfileValidationError(`"${key}" is longer than ${maxChars} characters`);
  }
  return value.trim();
}

export function parseProfile(raw: string): GeneratedProfile {
  let data: unknown;
  try {
    data = JSON.parse(stripCodeFence(raw));
  } catch {
    throw new ProfileValidationError("response is not valid JSON");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new ProfileValidationError("response is not a JSON object");
  }

  const obj = data as Record<string, unknown>;
  const headline = requireText(obj, "headline", HEADLINE_HARD_LIMIT);
  const description = requireText(obj, "description", DESCRIPTION_HARD_LIMIT);

  const words = countWords(description);
  const min = Math.floor(DESCRIPTION_MIN_WORDS * (1 - WORD_MARGIN));
  const max = Math.ceil(DESCRIPTION_MAX_WORDS * (1 + WORD_MARGIN));
  if (words < min || words > max) {
    throw new ProfileValidationError(`description has ${words} words (expected ${min}-${max})`);
  }

  return { headline, description };
}