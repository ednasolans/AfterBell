import { supabase } from '../../../lib/supabase';
import { type TechnicalSheetForm } from '../types';
import { toTechnicalSheetInsert } from './toTechnicalSheetInsert';

export async function saveTechnicalSheet(sheet: TechnicalSheetForm): Promise<void> {
  const { error } = await supabase.from('technical_sheets').insert(toTechnicalSheetInsert(sheet));
  if (error) {
    throw new Error(error.message);
  }
}