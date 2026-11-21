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
  it("gives the age of the active profile from its date of birth", async () => {
    // Born on 1 January ten years ago: 10 on any day of this year
    const year = new Date().getFullYear() - 10;
    mockActive({ date_of_birth: `${year}-01-01` });

    const { result } = await renderHook(() => useActiveProfileAges());

    expect(result.current).toEqual({ ageMin: 10, ageMax: 10 });
  });

  it("is null without an active profile", async () => {
    mockActive(null);

    const { result } = await renderHook(() => useActiveProfileAges());

    expect(result.current).toBeNull();
  });
});
