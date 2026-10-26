import { supabase } from "@/lib/supabase";

// Messages for the error codes returned by the generate-profile Edge Function
export const GENERATE_ERROR_MESSAGES: Record<string, string> = {
  no_technical_sheet:
    "Save your technical sheet before generating your profile.",
  already_approved: "Your profile is already published.",
  too_many_requests: "Please wait a few seconds before generating it again.",
  llm_timeout: "The AI took too long to answer. Please try again.",
  llm_unavailable: "The AI is not available right now. Please try again later.",
  invalid_ai_output: "The AI could not write your profile. Please try again.",
};

export const DEFAULT_GENERATE_ERROR =
  "Your profile could not be generated. Please try again.";

export function generateErrorMessage(code: string | undefined): string {
  if (!code) {
    return DEFAULT_GENERATE_ERROR;
  }
  return GENERATE_ERROR_MESSAGES[code] ?? DEFAULT_GENERATE_ERROR;
}

// The function answers { error: { code, message } }; Supabase keeps the
// response in error.context
async function readErrorCode(error: unknown): Promise<string | undefined> {
  const context = (error as { context?: { json?: () => Promise<unknown> } })
    .context;
  if (typeof context?.json !== "function") {
    return undefined;
  }
  try {
    const body = (await context.json()) as { error?: { code?: string } };
    return body.error?.code;
  } catch {
    return undefined;
  }
}

// Asks the Edge Function to write a new draft. The LLM key never reaches the app.
export async function generateProfile(): Promise<void> {
  const { error } = await supabase.functions.invoke("generate-profile");
  if (error) {
    throw new Error(generateErrorMessage(await readErrorCode(error)));
  }
}
