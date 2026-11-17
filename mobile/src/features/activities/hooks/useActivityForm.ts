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
      // Dates never apply to whole-year activities. Start with empty dates
      // when leaving that type, including forms loaded with stale dates.
      if (
        next.type === "whole_year" ||
        (field === "type" && previous.type === "whole_year")
      ) {
        return { ...next, startDate: null, endDate: null };
      }
      // Saved weekly slots are valid for every type.
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
      return true;
    } catch {
      return false;
    }
  }

  return { form, updateField, errors, submit };
}
