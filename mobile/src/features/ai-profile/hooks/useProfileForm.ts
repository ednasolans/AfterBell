import { useState } from "react";

import { hasErrors } from "@/lib/validation";

import { type ProfileForm } from "../types";
import { validateProfileForm } from "../validation";

type UseProfileFormOptions = {
  initialForm: ProfileForm;
  // Saves the form; throws when saving fails
  onSubmit: (form: ProfileForm) => Promise<void>;
};

export function useProfileForm({
  initialForm,
  onSubmit,
}: UseProfileFormOptions) {
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);

  // Errors are shown after the first save attempt and then update while typing
  const errors = submitted ? validateProfileForm(form) : {};

  function updateField<K extends keyof ProfileForm>(
    field: K,
    value: ProfileForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  // True when the form was valid and saved. The save error itself is shown
  // by the component from the mutation state.
  async function submit(): Promise<boolean> {
    setSubmitted(true);
    if (hasErrors(validateProfileForm(form))) {
      return false;
    }
    try {
      await onSubmit(form);
      return true;
    } catch {
      return false;
    }
  }

  return { form, errors, updateField, submit };
}
