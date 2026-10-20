import { act, renderHook } from "@testing-library/react-native";

import { saveTechnicalSheet } from "../api/saveTechnicalSheet";
import { EMPTY_TECHNICAL_SHEET_FORM, type TechnicalSheetForm } from "../types";
import { useTechnicalSheetForm } from "./useTechnicalSheetForm";

// The hook must be tested without Supabase: we control what "saving" does
jest.mock("../api/saveTechnicalSheet", () => ({
  saveTechnicalSheet: jest.fn(),
}));

const mockedSave = jest.mocked(saveTechnicalSheet);

const VALID_SHEET: TechnicalSheetForm = {
  ...EMPTY_TECHNICAL_SHEET_FORM,
  name: "Lleida Swimming Club",
  providerType: "sports_club",
  addresses: [{ address: "C/ Major 1", city: "Lleida" }],
  phoneNumber: "973 000 000",
  activityTypes: ["swimming"],
};

type HookResult = { current: ReturnType<typeof useTechnicalSheetForm> };

// Fills every field through updateField, as the user would do through the UI
async function fillForm(result: HookResult, sheet: TechnicalSheetForm) {
  await act(() => {
    (Object.keys(sheet) as (keyof TechnicalSheetForm)[]).forEach((field) => {
      result.current.updateField(field, sheet[field]);
    });
  });
}

async function submit(result: HookResult): Promise<boolean> {
  return act(() => result.current.submit());
}

beforeEach(() => {
  mockedSave.mockReset();
});

describe("useTechnicalSheetForm", () => {
  it("starts with an empty form and no visible errors", async () => {
    const { result } = await renderHook(() => useTechnicalSheetForm());

    expect(result.current.form).toEqual(EMPTY_TECHNICAL_SHEET_FORM);
    expect(result.current.errors).toEqual({});
  });

  it("updates a single field", async () => {
    const { result } = await renderHook(() => useTechnicalSheetForm());

    await act(() => {
      result.current.updateField("name", "Lleida Swimming Club");
    });

    expect(result.current.form.name).toBe("Lleida Swimming Club");
  });

  it("does not save an invalid form and shows its errors", async () => {
    const { result } = await renderHook(() => useTechnicalSheetForm());

    const saved = await submit(result);

    expect(saved).toBe(false);
    expect(mockedSave).not.toHaveBeenCalled();
    expect(result.current.errors.name).toBeDefined();
  });

  it("updates the errors while typing after the first attempt", async () => {
    const { result } = await renderHook(() => useTechnicalSheetForm());
    await submit(result);

    await act(() => {
      result.current.updateField("name", "Lleida Swimming Club");
    });

    expect(result.current.errors.name).toBeUndefined();
  });

  it("saves a valid form", async () => {
    mockedSave.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useTechnicalSheetForm());
    await fillForm(result, VALID_SHEET);

    const saved = await submit(result);

    expect(saved).toBe(true);
    expect(mockedSave).toHaveBeenCalledWith(VALID_SHEET);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveError).toBeNull();
  });

  it("shows an error when saving fails", async () => {
    mockedSave.mockRejectedValue(new Error("Network error"));
    const { result } = await renderHook(() => useTechnicalSheetForm());
    await fillForm(result, VALID_SHEET);

    const saved = await submit(result);

    expect(saved).toBe(false);
    expect(result.current.saveError).not.toBeNull();
    expect(result.current.isSaving).toBe(false);
  });
});
