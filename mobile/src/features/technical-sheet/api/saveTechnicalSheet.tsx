import { type TechnicalSheetForm } from '../types';

// Temporary fake: simulates a network call.
// Replace with the Supabase insert when the database issue (#2) is merged.
export async function saveTechnicalSheet(sheet: TechnicalSheetForm): Promise<TechnicalSheetForm> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return sheet;
}