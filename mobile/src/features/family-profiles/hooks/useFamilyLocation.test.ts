import { act, renderHook, waitFor } from "@testing-library/react-native";

import { recommendationKeys } from "@/lib/recommendationKeys";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { saveFamilyLocation } from "../api/familyLocation";
import { familyLocationKey, useSaveFamilyLocation } from "./useFamilyLocation";

jest.mock("../api/familyLocation", () => ({
  fetchFamilyCity: jest.fn(),
  saveFamilyLocation: jest.fn(),
}));
// Imported through familyProfileKeys; these tests never call it
jest.mock("../api/familyProfiles", () => ({}));

const LOCATION = {
  city: "Lleida",
  coordinates: { latitude: 41.61, longitude: 0.62 },
};

async function renderSave() {
  const client = createTestQueryClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  const { result } = await renderHook(() => useSaveFamilyLocation(), {
    wrapper: createQueryClientWrapper(client),
  });
  return { result, invalidate };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useSaveFamilyLocation", () => {
  it("refreshes the town and the recommendations after saving", async () => {
    jest.mocked(saveFamilyLocation).mockResolvedValue();
    const { result, invalidate } = await renderSave();

    await act(() => result.current.mutateAsync(LOCATION));

    expect(saveFamilyLocation).toHaveBeenCalledWith(
      LOCATION,
      expect.anything(),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: familyLocationKey });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: recommendationKeys.all,
    });
  });

  it("refreshes nothing when saving fails", async () => {
    jest.mocked(saveFamilyLocation).mockRejectedValue(new Error("boom"));
    const { result, invalidate } = await renderSave();

    await act(() => {
      result.current.mutate(LOCATION);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidate).not.toHaveBeenCalled();
  });
});
