import { act, renderHook } from "@testing-library/react-native";

import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("changes only once the value stops changing for the delay", async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 300),
      { initialProps: { value: "" } },
    );

    await rerender({ value: "m" });
    await act(() => jest.advanceTimersByTime(200));
    await rerender({ value: "mu" });
    await act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe("");

    await act(() => jest.advanceTimersByTime(100));
    expect(result.current).toBe("mu");
  });
});
