import { useState } from 'react';
import { EMPTY_TECHNICAL_SHEET_FORM, type TechnicalSheetForm } from '../types';

export function useTechnicalSheetForm() {
  const [form, setForm] = useState<TechnicalSheetForm>(EMPTY_TECHNICAL_SHEET_FORM);

  function updateField<K extends keyof TechnicalSheetForm>(
    field: K,
    value: TechnicalSheetForm[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  return { form, updateField };
}
