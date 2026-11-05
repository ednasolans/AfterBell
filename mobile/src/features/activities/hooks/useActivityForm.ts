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
  const [submitted, setSubmitted] = useState(false);

  // Errors are only shown after the first attempt to save, then they update while typing
  const errors = submitted ? validateActivity(form, initialForm) : {};

  function updateField<K extends keyof ActivityForm>(
    field: K,
    value: ActivityForm[K],
  ) {
    setForm((previous) => {
      const next = { ...previous, [field]: value };
      // A whole-year activity has no dates
      return next.type === "whole_year"
        ? { ...next, startDate: null, endDate: null }
        : next;
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
      return true;
    } catch {
      return false;
    }
  }

  return { form, updateField, errors, submit };
}
