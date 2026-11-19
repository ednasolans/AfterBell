import { useRef, useState } from "react";

import { hasErrors } from "@/lib/validation";

import {
  EMPTY_ACTIVITY_FORM,
  type ActivityForm,
  type ActivityLanguageField,
} from "../types";
import { validateActivity } from "../validation";

type ActivityFormFields = Omit<ActivityForm, "languages"> & {
  languages: ActivityLanguageField[];
};

type UseActivityFormOptions = {
  // Starting values: empty to create, the saved activity to edit
  initialForm?: ActivityForm;
  isPublished?: boolean;
  // Saves the form; it must throw if saving fails
  onSubmit: (form: ActivityForm) => Promise<unknown>;
};

export function useActivityForm({
  initialForm = EMPTY_ACTIVITY_FORM,
  isPublished = false,
  onSubmit,
}: UseActivityFormOptions) {
  const [form, setForm] = useState<ActivityFormFields>(() => ({
    ...initialForm,
    languages: initialForm.languages.map((pair, id) => ({ ...pair, id })),
  }));
  const nextLanguageId = useRef(initialForm.languages.length);
  // The values last saved: what the database has now
  const [savedForm, setSavedForm] = useState<ActivityForm>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const values: ActivityForm = {
    ...form,
    languages: form.languages.map(({ language, level }) => ({
      language,
      level,
    })),
  };
  const hasUnsavedChanges = !isSameForm(values, savedForm);

  // Errors are only shown after the first attempt to save, then they update while typing
  const errors = submitted
    ? validateActivity(values, savedForm, undefined, isPublished)
    : {};

  function updateField<K extends keyof ActivityFormFields>(
    field: K,
    value: ActivityFormFields[K],
  ) {
    setForm((previous) => {
      let next = { ...previous, [field]: value };
      // Clear inapplicable dates when entering or leaving whole-year activities.
      if (
        next.type === "whole_year" ||
        (field === "type" && previous.type === "whole_year")
      ) {
        next = { ...next, startDate: null, endDate: null };
      }
      // "No limit" has no maximum
      if (next.unlimitedParticipants) {
        next = { ...next, maxParticipants: null };
      }
      return next;
    });
  }

  function addLanguage() {
    const id = nextLanguageId.current++;
    setForm((previous) => ({
      ...previous,
      languages: [...previous.languages, { id, language: "", level: "" }],
    }));
  }

  // Returns true when the activity has been saved
  async function submit(): Promise<boolean> {
    setSubmitted(true);
    if (
      hasErrors(validateActivity(values, savedForm, undefined, isPublished))
    ) {
      return false;
    }
    try {
      await onSubmit(values);
      setSavedForm(values);
      return true;
    } catch {
      return false;
    }
  }

  return { form, updateField, addLanguage, errors, submit, hasUnsavedChanges };
}

// Field by field, so the order of the keys does not matter
function isSameForm(a: ActivityForm, b: ActivityForm): boolean {
  return (Object.keys(a) as (keyof ActivityForm)[]).every(
    (field) => JSON.stringify(a[field]) === JSON.stringify(b[field]),
  );
}
