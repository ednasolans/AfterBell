import { act, renderHook } from "@testing-library/react-native";

import { NO_SEARCH_FILTERS, type SearchFilters } from "@/lib/searchFilters";

import { SEARCH_ERROR_MESSAGES } from "../api/searchActivities";
import { useFilterForm } from "./useFilterForm";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

const APPLIED: SearchFilters = {
  ...NO_SEARCH_FILTERS,
  categories: ["music"],
  city: "Lleida",
};

async function renderForm(initialFilters = APPLIED, onApply = jest.fn()) {
  const { result } = await renderHook(() =>
    useFilterForm({ initialFilters, onApply }),
  );
  return { result, onApply };
}

describe("useFilterForm", () => {
  it("starts from the applied filters, without errors", async () => {
    const { result } = await renderForm();

    expect(result.current.form).toEqual(APPLIED);
    expect(result.current.errors).toEqual({});
  });

  it("changes one field and keeps the others", async () => {
    const { result } = await renderForm();

    await act(() => result.current.updateField("ageMin", 6));

    expect(result.current.form).toEqual({ ...APPLIED, ageMin: 6 });
  });

  it("applies valid filters", async () => {
    const { result, onApply } = await renderForm();
    await act(() => result.current.updateField("ageMax", 9));

    let applied = false;
    await act(() => {
      applied = result.current.apply();
    });

    expect(applied).toBe(true);
    expect(onApply).toHaveBeenCalledWith({ ...APPLIED, ageMax: 9 });
  });

  it("does not apply invalid filters and shows the errors from then on", async () => {
    const { result, onApply } = await renderForm();
    await act(() => result.current.updateField("ageMin", 10));
    await act(() => result.current.updateField("ageMax", 9));
    expect(result.current.errors).toEqual({});

    let applied = true;
    await act(() => {
      applied = result.current.apply();
    });

    expect(applied).toBe(false);
    expect(onApply).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual({
      age: SEARCH_ERROR_MESSAGES.search_invalid_age_range,
    });

    await act(() => result.current.updateField("ageMax", 12));
    expect(result.current.errors).toEqual({});
  });

  it("resets every filter and hides the errors without applying", async () => {
    const { result, onApply } = await renderForm();
    await act(() => result.current.updateField("priceMax", 20));
    await act(() => {
      result.current.apply();
    });

    await act(() => result.current.reset());

    expect(result.current.form).toEqual(NO_SEARCH_FILTERS);
    expect(result.current.errors).toEqual({});
    expect(result.current.resetCount).toBe(1);
    expect(onApply).not.toHaveBeenCalled();
  });
});
