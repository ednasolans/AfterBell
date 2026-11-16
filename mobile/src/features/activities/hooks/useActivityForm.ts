import { useState } from "react";

import { hasErrors } from "@/lib/validation";

import { EMPTY_ACTIVITY_FORM, type ActivityForm } from "../types";
import { validateActivity } from "../validation";

type UseActivityFormOptions = {
  // Starting values: empty to create, the saved activity to edit
  initialForm?: ActivityForm;
  // Saves the form; it must throw if saving fails
  onSubmit: (form: ActivityForm) => Promise<unknown>;
};

export function useActivityForm({
  initialForm = EMPTY_ACTIVITY_FORM,
  onSubmit,
}: UseActivityFormOptions) {
  const [form, setForm] = useState<ActivityForm>(initialForm);
  // The values last saved: what the database has now
  const [savedForm, setSavedForm] = useState<ActivityForm>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const hasUnsavedChanges = !isSameForm(form, savedForm);

  // Errors are only shown after the first attempt to save, then they update while typing
  const errors = submitted ? validateActivity(form, initialForm) : {};

  function updateField<K extends keyof ActivityForm>(
    field: K,
    value: ActivityForm[K],
  ) {
    setForm((previous) => {
      let next = { ...previous, [field]: value };
      // A whole-year activity has no dates
      if (next.type === "whole_year") {
        next = { ...next, startDate: null, endDate: null };
      }
      // "No limit" has no maximum
      if (next.unlimitedParticipants) {
        next = { ...next, maxParticipants: null };
      }
      return next;
    });
  }

  // Returns true when the activity has been saved
  async function submit(): Promise<boolean> {
    setSubmitted(true);
    if (hasErrors(validateActivity(form, initialForm))) {
      return false;
    }
    try {
      await onSubmit(form);
      setSavedForm(form);
      return true;
    } catch {
      return false;
    }
  }

  return { form, updateField, errors, submit, hasUnsavedChanges };
}

// Field by field, so the order of the keys does not matter
function isSameForm(a: ActivityForm, b: ActivityForm): boolean {
  return (Object.keys(a) as (keyof ActivityForm)[]).every(
    (field) => JSON.stringify(a[field]) === JSON.stringify(b[field]),
  );
}
