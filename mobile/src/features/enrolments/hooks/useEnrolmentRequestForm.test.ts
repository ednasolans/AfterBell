import { act, renderHook } from "@testing-library/react-native";

import { useEnrolmentRequestForm } from "./useEnrolmentRequestForm";

describe("useEnrolmentRequestForm", () => {
  it("starts empty, without visible errors", async () => {
    const { result } = await renderHook(() =>
      useEnrolmentRequestForm({ onSubmit: jest.fn() }),
    );

    expect(result.current.form).toEqual({ profileIds: [], message: "" });
    expect(result.current.errors).toEqual({});
  });

  it("does not send an invalid form and shows its errors", async () => {
    const onSubmit = jest.fn();
    const { result } = await renderHook(() =>
      useEnrolmentRequestForm({ onSubmit }),
    );

    const sent = await act(() => result.current.submit());

    expect(sent).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.profileIds).toBe("Choose who would attend");
  });

  it("sends a valid form", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() =>
      useEnrolmentRequestForm({ onSubmit }),
    );

    await act(() => {
      result.current.updateField("profileIds", ["anna"]);
    });
    const sent = await act(() => result.current.submit());

    expect(sent).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith({
      profileIds: ["anna"],
      message: "",
    });
  });

  it("returns false when sending fails", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error("boom"));
    const { result } = await renderHook(() =>
      useEnrolmentRequestForm({ onSubmit }),
    );

    await act(() => {
      result.current.updateField("profileIds", ["anna"]);
    });
    const sent = await act(() => result.current.submit());

    expect(sent).toBe(false);
  });
});
