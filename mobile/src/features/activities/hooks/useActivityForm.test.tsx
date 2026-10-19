import { act, renderHook } from "@testing-library/react-native";

import { EMPTY_ACTIVITY_FORM, type ActivityForm } from "../types";
import { useActivityForm } from "./useActivityForm";

const VALID_ACTIVITY: ActivityForm = {
  title: "Swimming for kids",
  description: "",
  category: "swimming",
  targetAgeRanges: ["7-9"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  priceMin: 30,
  priceMax: 40,
  pricePeriod: "per_month",
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
});
