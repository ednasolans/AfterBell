import { act, renderHook } from "@testing-library/react-native";

import { useProfileForm } from "./useProfileForm";

const INITIAL = { headline: "Music lessons", description: "A music school." };

async function renderForm(onSubmit = jest.fn().mockResolvedValue(undefined)) {
  const { result } = await renderHook(() =>
    useProfileForm({ initialForm: INITIAL, onSubmit }),
  );
  return { result, onSubmit };
}

describe("useProfileForm", () => {
  it("starts with the initial values and no errors", async () => {
    const { result } = await renderForm();
    expect(result.current.form).toEqual(INITIAL);
    expect(result.current.errors).toEqual({});
  });

  it("updates one field", async () => {
    const { result } = await renderForm();
    await act(() => {
      result.current.updateField("headline", "New headline");
    });
    expect(result.current.form.headline).toBe("New headline");
  });

  it("saves a valid form", async () => {
    const { result, onSubmit } = await renderForm();
    let saved = false;
    await act(async () => {
      saved = await result.current.submit();
    });
    expect(saved).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith(INITIAL);
  });

  it("shows errors and does not save an invalid form", async () => {
    const { result, onSubmit } = await renderForm();
    await act(() => {
      result.current.updateField("headline", "");
    });
    let saved = true;
    await act(async () => {
      saved = await result.current.submit();
    });
    expect(saved).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.headline).toBe("Headline is required.");
  });

  it("returns false when saving fails", async () => {
    const { result } = await renderForm(
      jest.fn().mockRejectedValue(new Error("x")),
    );
    let saved = true;
    await act(async () => {
      saved = await result.current.submit();
    });
    expect(saved).toBe(false);
  });
});
