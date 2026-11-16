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
  const [submitted, setSubmitted] = useState(false);

  // Errors are only shown after the first attempt to save, then they update while typing
  const errors = submitted
    ? validateActivity(form, initialForm, undefined, isPublished)
    : {};

  function updateField<K extends keyof ActivityFormFields>(
    field: K,
    value: ActivityFormFields[K],
  ) {
    setForm((previous) => {
      const next = { ...previous, [field]: value };
      // A whole-year activity has no dates
      return next.type === "whole_year"
        ? { ...next, startDate: null, endDate: null }
        : next;
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
      hasErrors(validateActivity(form, initialForm, undefined, isPublished))
    ) {
      return false;
    }
    try {
      await onSubmit({
        ...form,
        languages: form.languages.map(({ language, level }) => ({
          language,
          level,
        })),
      });
      return true;
    } catch {
      return false;
    }
  }

  return { form, updateField, addLanguage, errors, submit };
}
