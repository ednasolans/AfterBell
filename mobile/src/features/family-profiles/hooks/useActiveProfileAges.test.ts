import { renderHook } from "@testing-library/react-native";

import { useActiveProfile } from "../context/ActiveProfileProvider";
import type { FamilyProfile } from "../types";
import { useActiveProfileAges } from "./useActiveProfileAges";

jest.mock("../context/ActiveProfileProvider", () => ({
  useActiveProfile: jest.fn(),
}));

const mockedUseActiveProfile = jest.mocked(useActiveProfile);

function mockActive(activeProfile: Partial<FamilyProfile> | null) {
  mockedUseActiveProfile.mockReturnValue({
    activeProfile: activeProfile as FamilyProfile | null,
  } as ReturnType<typeof useActiveProfile>);
}

describe("useActiveProfileAges", () => {
  it("gives the ages of the active profile", async () => {
    mockActive({ date_of_birth: null, age_range: "10-12" });

    const { result } = await renderHook(() => useActiveProfileAges());

    expect(result.current).toEqual({ ageMin: 10, ageMax: 12 });
  });

  it("is null without an active profile", async () => {
    mockActive(null);

    const { result } = await renderHook(() => useActiveProfileAges());

    expect(result.current).toBeNull();
  });
});
