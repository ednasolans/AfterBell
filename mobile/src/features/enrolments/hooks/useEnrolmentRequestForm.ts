import { useState } from "react";

import { hasErrors } from "@/lib/validation";

import {
  EMPTY_ENROLMENT_REQUEST_FORM,
  type EnrolmentRequestForm,
} from "../types";
import { validateEnrolmentRequest } from "../validation";

type UseEnrolmentRequestFormOptions = {
  // Sends the requests; it must throw if sending fails
  onSubmit: (form: EnrolmentRequestForm) => Promise<unknown>;
};

export function useEnrolmentRequestForm({
  onSubmit,
}: UseEnrolmentRequestFormOptions) {
  const [form, setForm] = useState<EnrolmentRequestForm>(
    EMPTY_ENROLMENT_REQUEST_FORM,
  );
  const [submitted, setSubmitted] = useState(false);

  // Errors are only shown after the first attempt to send
  const errors = submitted ? validateEnrolmentRequest(form) : {};

  function updateField<K extends keyof EnrolmentRequestForm>(
    field: K,
    value: EnrolmentRequestForm[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  // Returns true when the requests have been sent
  async function submit(): Promise<boolean> {
    setSubmitted(true);
    if (hasErrors(validateEnrolmentRequest(form))) {
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
