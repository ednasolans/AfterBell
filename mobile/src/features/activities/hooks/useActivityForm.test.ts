import { act, renderHook } from "@testing-library/react-native";

import { EMPTY_ACTIVITY_FORM, type ActivityForm } from "../types";
import { useActivityForm } from "./useActivityForm";

const VALID_ACTIVITY: ActivityForm = {
  isTutor: false,
  languages: [],
  title: "Swimming for kids",
  description: "",
  category: "swimming",
  type: "whole_year",
  startDate: null,
  endDate: null,
  targetAgeRanges: ["7-9", "10-12"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  price: 30,
  pricePeriod: "per_month",
  maxParticipants: 12,
  unlimitedParticipants: false,
  addressId: "address-1",
};

describe("useActivityForm", () => {
  it("starts empty by default, without visible errors", async () => {
    const { result } = await renderHook(() =>
      useActivityForm({ onSubmit: jest.fn() }),
    );

    expect(result.current.form).toEqual(EMPTY_ACTIVITY_FORM);
    expect(result.current.errors).toEqual({});
  });

  it("starts with the given values, to edit an activity", async () => {
    const { result } = await renderHook(() =>
      useActivityForm({ initialForm: VALID_ACTIVITY, onSubmit: jest.fn() }),
    );

    expect(result.current.form).toEqual(VALID_ACTIVITY);
  });

  it("keeps language IDs stable when removing, editing and adding rows", async () => {
    const { result } = await renderHook(() =>
      useActivityForm({
        initialForm: {
          ...VALID_ACTIVITY,
          category: "language",
          languages: [
            { language: "English", level: "B1" },
            { language: "Catalan", level: "C1" },
          ],
        },
        onSubmit: jest.fn(),
      }),
    );
    const [removed, retained] = result.current.form.languages;

    await act(() => {
      result.current.updateField("languages", [{ ...retained, level: "C2" }]);
      result.current.addLanguage();
    });

    const [edited, added] = result.current.form.languages;
    expect(edited).toEqual({ ...retained, level: "C2" });
    expect([removed.id, retained.id]).not.toContain(added.id);
  });

  it("does not submit an invalid form and shows its errors", async () => {
    const onSubmit = jest.fn();
    const { result } = await renderHook(() => useActivityForm({ onSubmit }));

    const saved = await act(() => result.current.submit());

    expect(saved).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.title).toBeDefined();
  });

  it("updates the errors while typing after the first attempt", async () => {
    const { result } = await renderHook(() =>
      useActivityForm({ onSubmit: jest.fn() }),
    );
    await act(() => result.current.submit());

    await act(() => {
      result.current.updateField("title", "Swimming for kids");
    });

    expect(result.current.errors.title).toBeUndefined();
  });

  it("submits a valid form", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() =>
      useActivityForm({ initialForm: VALID_ACTIVITY, onSubmit }),
    );

    const saved = await act(() => result.current.submit());

    expect(saved).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith(VALID_ACTIVITY);
  });

  it("returns false when saving fails", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error("Network error"));
    const { result } = await renderHook(() =>
      useActivityForm({ initialForm: VALID_ACTIVITY, onSubmit }),
    );

    const saved = await act(() => result.current.submit());

    expect(saved).toBe(false);
  });

  it("clears the dates when the activity becomes whole-year", async () => {
    const { result } = await renderHook(() =>
      useActivityForm({
        initialForm: {
          ...EMPTY_ACTIVITY_FORM,
          type: "temporary",
          startDate: "2027-07-01",
          endDate: "2027-07-15",
        },
        onSubmit: jest.fn(),
      }),
    );

    await act(() => {
      result.current.updateField("type", "whole_year");
    });

    expect(result.current.form.startDate).toBeNull();
    expect(result.current.form.endDate).toBeNull();
  });

  it("keeps the dates when another field changes", async () => {
    const { result } = await renderHook(() =>
      useActivityForm({
        initialForm: {
          ...EMPTY_ACTIVITY_FORM,
          type: "temporary",
          startDate: "2027-07-01",
        },
        onSubmit: jest.fn(),
      }),
    );

    await act(() => {
      result.current.updateField("title", "Summer camp");
    });

    expect(result.current.form.startDate).toBe("2027-07-01");
  });

  it("clears the maximum when the provider chooses no limit", async () => {
    const { result } = await renderHook(() =>
      useActivityForm({ initialForm: VALID_ACTIVITY, onSubmit: jest.fn() }),
    );

    await act(() => result.current.updateField("unlimitedParticipants", true));

    expect(result.current.form.maxParticipants).toBeNull();
    expect(result.current.errors).toEqual({});
  });

  it("knows when there are unsaved changes, until they are saved", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() =>
      useActivityForm({ initialForm: VALID_ACTIVITY, onSubmit }),
    );
    expect(result.current.hasUnsavedChanges).toBe(false);

    await act(() => result.current.updateField("title", "Swimming for teens"));
    expect(result.current.hasUnsavedChanges).toBe(true);

    await act(() => result.current.submit());
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it("has no unsaved changes when a field goes back to its saved value", async () => {
    const { result } = await renderHook(() =>
      useActivityForm({ initialForm: VALID_ACTIVITY, onSubmit: jest.fn() }),
    );

    await act(() => result.current.updateField("title", "Other"));
    await act(() => result.current.updateField("title", "Swimming for kids"));

    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it("keeps the unsaved changes when saving fails", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error("offline"));
    const { result } = await renderHook(() =>
      useActivityForm({ initialForm: VALID_ACTIVITY, onSubmit }),
    );

    await act(() => result.current.updateField("title", "Swimming for teens"));
    await act(() => result.current.submit());

    expect(result.current.hasUnsavedChanges).toBe(true);
  });
});

describe("activity and event switching", () => {
  const EVENT: ActivityForm = {
    ...VALID_ACTIVITY,
    type: "event",
    startDate: "2099-07-01",
    endDate: "2099-07-15",
  };

  it("clears event dates and preserves all shared fields and saved slots", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() =>
      useActivityForm({ initialForm: EVENT, onSubmit }),
    );

    await act(() => result.current.updateField("type", "whole_year"));

    expect(result.current.form).toEqual({
      ...EVENT,
      type: "whole_year",
      startDate: null,
      endDate: null,
    });
    expect(await act(() => result.current.submit())).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith(result.current.form);
    expect(EVENT.startDate).toBe("2099-07-01");
  });

  it("does not restore event dates after switching back", async () => {
    const { result } = await renderHook(() =>
      useActivityForm({ initialForm: EVENT, onSubmit: jest.fn() }),
    );

    await act(() => result.current.updateField("type", "whole_year"));
    await act(() => result.current.updateField("type", "event"));

    expect(result.current.form).toEqual({
      ...EVENT,
      startDate: null,
      endDate: null,
    });
  });

  it("discards stale dates when a saved whole-year activity becomes an event", async () => {
    const { result } = await renderHook(() =>
      useActivityForm({
        initialForm: { ...EVENT, type: "whole_year" },
        onSubmit: jest.fn(),
      }),
    );

    await act(() => result.current.updateField("type", "event"));

    expect(result.current.form.startDate).toBeNull();
    expect(result.current.form.endDate).toBeNull();
  });

  it("keeps event dates when editing a shared field", async () => {
    const { result } = await renderHook(() =>
      useActivityForm({ initialForm: EVENT, onSubmit: jest.fn() }),
    );

    await act(() => result.current.updateField("title", "Swimming event"));

    expect(result.current.form).toEqual({ ...EVENT, title: "Swimming event" });
  });

  it("updates schedule and date errors immediately after type changes", async () => {
    const onSubmit = jest.fn();
    const { result } = await renderHook(() =>
      useActivityForm({
        initialForm: { ...EVENT, schedule: [] },
        onSubmit,
      }),
    );

    expect(await act(() => result.current.submit())).toBe(true);
    await act(() => result.current.updateField("type", "whole_year"));
    expect(result.current.errors).toEqual({
      schedule: "Add at least one time slot",
    });

    await act(() => result.current.updateField("type", "event"));
    expect(result.current.errors).toEqual({
      startDate: "Choose the start date",
      endDate: "Choose the end date",
    });
    expect(await act(() => result.current.submit())).toBe(false);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
