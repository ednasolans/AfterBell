
import {
  getActiveFamilyProfile,
  getActiveProfileStorageKey,
  sortFamilyProfiles,
} from "./activeProfile";
import type { FamilyProfile } from "./types";

const PAU = {
  id: "10000000-0000-4000-8000-000000000001",
  family_group_id: "20000000-0000-4000-8000-000000000001",
  first_name: "Pau",
  age_range: "7-9",
  interests: ["football"],
  created_at: "2026-01-01T10:00:00.000Z",
} as FamilyProfile;

const LAIA = {
  id: "10000000-0000-4000-8000-000000000002",
  family_group_id: PAU.family_group_id,
  first_name: "Laia",
  age_range: "4-6",
  interests: ["music"],
  created_at: "2026-01-02T10:00:00.000Z",
} as FamilyProfile;

const NORA = {
  id: "10000000-0000-4000-8000-000000000003",
  family_group_id: PAU.family_group_id,
  first_name: "Nora",
  age_range: "10-12",
  interests: ["art"],
  created_at: "2026-01-03T10:00:00.000Z",
} as FamilyProfile;

describe("active family profile", () => {
  test("defaults to the main profile", () => {
    const result = getActiveFamilyProfile(
      [NORA, LAIA, PAU],
      null,
    );

    expect(result?.id).toBe(PAU.id);
  });

  test("uses the selected profile", () => {
    const result = getActiveFamilyProfile(
      [PAU, LAIA, NORA],
      LAIA.id,
    );

    expect(result?.first_name).toBe("Laia");
  });

  test("falls back to the main profile when selection is invalid", () => {
    const result = getActiveFamilyProfile(
      [PAU, LAIA],
      "deleted-profile-id",
    );

    expect(result?.id).toBe(PAU.id);
  });

  test("returns null when there are no profiles", () => {
    expect(getActiveFamilyProfile([], null)).toBeNull();
  });

  test("sorts profiles by creation date", () => {
    const result = sortFamilyProfiles([NORA, PAU, LAIA]);

    expect(result.map((profile) => profile.first_name)).toEqual([
      "Pau",
      "Laia",
      "Nora",
    ]);
  });

  test("uses id to break equal-timestamp ties", () => {
    const sameTimestamp = {
      ...LAIA,
      created_at: PAU.created_at,
    };

    const result = sortFamilyProfiles([
      sameTimestamp,
      PAU,
    ]);

    expect(result[0].id).toBe(PAU.id);
  });

  test("uses a separate storage key per account", () => {
    const keyA = getActiveProfileStorageKey("customer-a");
    const keyB = getActiveProfileStorageKey("customer-b");

    expect(keyA).not.toBe(keyB);
  });
});
