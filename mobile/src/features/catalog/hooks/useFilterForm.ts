import { useState } from "react";

import { NO_SEARCH_FILTERS, type SearchFilters } from "@/lib/searchFilters";
import { hasErrors } from "@/lib/validation";

import { searchFilterErrors } from "../api/searchActivities";

type UseFilterFormOptions = {
  // The filters applied now: the panel starts from them
  initialFilters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
};

// The filters being chosen in the panel. They only reach the search when
// they are applied, so a range half typed is never searched.
export function useFilterForm({
  initialFilters,
  onApply,
}: UseFilterFormOptions) {
  const [form, setForm] = useState<SearchFilters>(initialFilters);
  const [submitted, setSubmitted] = useState(false);
  // Changes on every reset, so the number fields drop the text they keep
  const [resetCount, setResetCount] = useState(0);

  // Errors are only shown after the first attempt to apply, then they update while typing
  const errors = submitted ? searchFilterErrors(form) : {};

  function updateField<K extends keyof SearchFilters>(
    field: K,
    value: SearchFilters[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function reset() {
    setForm(NO_SEARCH_FILTERS);
    setSubmitted(false);
    setResetCount((count) => count + 1);
  }

  // Returns true when the filters were valid and have been applied
  function apply(): boolean {
    setSubmitted(true);
    if (hasErrors(searchFilterErrors(form))) {
      return false;
    }
    onApply(form);
    return true;
  }

  return { form, updateField, errors, reset, resetCount, apply };
}
