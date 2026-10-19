import { useState } from "react";

import { saveTechnicalSheet } from "../api/saveTechnicalSheet";
import { EMPTY_TECHNICAL_SHEET_FORM, type TechnicalSheetForm } from "../types";
import { hasErrors } from "@/lib/validation";

import { validateTechnicalSheet } from "../validation";

export function useTechnicalSheetForm() {
  const [form, setForm] = useState<TechnicalSheetForm>(
    EMPTY_TECHNICAL_SHEET_FORM,
  );
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Errors are only shown after the first attempt to save, then they update while typing
  const errors = submitted ? validateTechnicalSheet(form) : {};

  function updateField<K extends keyof TechnicalSheetForm>(
    field: K,
    value: TechnicalSheetForm[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  // Returns true when the sheet has been saved
  async function submit(): Promise<boolean> {
    setSubmitted(true);
    if (hasErrors(validateTechnicalSheet(form))) {
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await saveTechnicalSheet(form);
      return true;
    } catch {
      setSaveError("The technical sheet could not be saved. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return { form, updateField, errors, isSaving, saveError, submit };
}
