
import { supabase } from "@/lib/supabase";

import {
  getFamilyGroupId,
  fetchFamilyProfiles,
  fetchFamilyProfile,
  createFamilyProfile,
  updateFamilyProfile,
  deleteFamilyProfile,
} from "./familyProfiles";

import type { FamilyProfileFormValues } from "../types";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const USER_ID = "user-1";
const GROUP_ID = "group-1";
const PROFILE_ID = "profile-1";

const VALUES: FamilyProfileFormValues = {
  firstName: "Anna",
  ageRange: "7-9",
  interests: ["music", "swimming"],
};

const PROFILE = {
  id: PROFILE_ID,
  family_group_id: GROUP_ID,
  first_name: "Anna",
  age_range: "7-9",
  interests: ["music", "swimming"],
  created_at: "2026-10-24T10:00:00Z",
};

function createQueryMock() {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    single: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    then: jest.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.insert.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.delete.mockReturnValue(query);

  return query;
}

let membersQuery: ReturnType<typeof createQueryMock>;
let profilesQuery: ReturnType<typeof createQueryMock>;


beforeEach(() => {
  jest.clearAllMocks();

  membersQuery = createQueryMock();
  profilesQuery = createQueryMock();

  jest.mocked(supabase.auth.getUser).mockResolvedValue({
    data: {
      user: { id: USER_ID },
    },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.getUser>>);

  membersQuery.single.mockResolvedValue({
    data: { family_group_id: GROUP_ID },
    error: null,
  });

  // Default response for family profile list queries.
  // The query builder supports multiple .order() calls.
  profilesQuery.then.mockImplementation((resolve) =>
    Promise.resolve({
      data: [PROFILE],
      error: null,
    }).then(resolve),
  );

  // Default response for queries ending with .single().
  profilesQuery.single.mockResolvedValue({
    data: PROFILE,
    error: null,
  });

  jest.mocked(supabase.from).mockImplementation((table) => {
    if (table === "family_group_members") {
      return membersQuery as unknown as ReturnType<
        typeof supabase.from
      >;
    }

    return profilesQuery as unknown as ReturnType<
      typeof supabase.from
    >;
  });
});

describe("getFamilyGroupId", () => {
  it("returns the authenticated user's family group", async () => {
    const result = await getFamilyGroupId();

    expect(result).toBe(GROUP_ID);

    expect(supabase.from).toHaveBeenCalledWith(
      "family_group_members",
    );

    expect(membersQuery.eq).toHaveBeenCalledWith(
      "account_id",
      USER_ID,
    );
  });

  it("rejects an unauthenticated user", async () => {
    jest.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

    await expect(getFamilyGroupId()).rejects.toThrow(
      "You must be logged in",
    );
  });

  it("propagates a membership query error", async () => {
    membersQuery.single.mockResolvedValue({
      data: null,
      error: new Error("Membership lookup failed"),
    });

    await expect(getFamilyGroupId()).rejects.toThrow(
      "Membership lookup failed",
    );
  });
});

describe("fetchFamilyProfiles", () => {
  it("lists profiles belonging to the user's group", async () => {
    const result = await fetchFamilyProfiles();

    expect(result).toEqual([PROFILE]);

    expect(supabase.from).toHaveBeenCalledWith(
      "family_profiles",
    );

    expect(profilesQuery.select).toHaveBeenCalledWith("*");

    expect(profilesQuery.eq).toHaveBeenCalledWith(
      "family_group_id",
      GROUP_ID,
    );

    // Primary ordering: oldest profile first.
    expect(profilesQuery.order).toHaveBeenCalledWith(
      "created_at",
      { ascending: true },
    );

    // Secondary ordering: stable order when timestamps match.
    expect(profilesQuery.order).toHaveBeenCalledWith(
      "id",
      { ascending: true },
    );

    expect(profilesQuery.order).toHaveBeenCalledTimes(2);
  });

  it("returns an empty array when there are no profiles", async () => {
    profilesQuery.then.mockImplementation((resolve) =>
      Promise.resolve({
        data: [],
        error: null,
      }).then(resolve),
    );

    await expect(fetchFamilyProfiles()).resolves.toEqual([]);
  });

  it("propagates a database error", async () => {
    profilesQuery.then.mockImplementation((resolve) =>
      Promise.resolve({
        data: null,
        error: new Error("Database error"),
      }).then(resolve),
    );

    await expect(fetchFamilyProfiles()).rejects.toThrow(
      "Database error",
    );
  });
});


  it("returns an empty array when there are no profiles", async () => {
    profilesQuery.then.mockImplementation((resolve) =>
        Promise.resolve({
            data: [],
            error: null,
        }).then(resolve),
    );

    await expect(fetchFamilyProfiles()).resolves.toEqual([]);
  });

  it("propagates a database error", async () => {
    profilesQuery.then.mockImplementation((resolve) =>
        Promise.resolve({
            data: null,
            error: new Error("Database error"),
        }).then(resolve),
    );

    await expect(fetchFamilyProfiles()).rejects.toThrow(
      "Database error",
    );
  });

describe("fetchFamilyProfile", () => {
  it("fetches a profile by id and family group", async () => {
    const result = await fetchFamilyProfile(PROFILE_ID);

    expect(result).toEqual(PROFILE);
    expect(profilesQuery.eq).toHaveBeenCalledWith(
      "id",
      PROFILE_ID,
    );
    expect(profilesQuery.eq).toHaveBeenCalledWith(
      "family_group_id",
      GROUP_ID,
    );
  });
});

describe("createFamilyProfile", () => {
  it("inserts a profile in the user's family group", async () => {
    const result = await createFamilyProfile(VALUES);

    expect(result).toEqual(PROFILE);

    expect(profilesQuery.insert).toHaveBeenCalledWith({
      family_group_id: GROUP_ID,
      first_name: "Anna",
      age_range: "7-9",
      interests: ["music", "swimming"],
    });
  });

  it("trims the first name before inserting", async () => {
    await createFamilyProfile({
      ...VALUES,
      firstName: "  Anna  ",
    });

    expect(profilesQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: "Anna",
      }),
    );
  });

  it("rejects a missing age range", async () => {
    await expect(
      createFamilyProfile({
        ...VALUES,
        ageRange: null,
      }),
    ).rejects.toThrow("Age range is required");

    expect(profilesQuery.insert).not.toHaveBeenCalled();
  });

  it("propagates an RLS error", async () => {
    profilesQuery.single.mockResolvedValue({
      data: null,
      error: new Error("row-level security policy"),
    });

    await expect(createFamilyProfile(VALUES)).rejects.toThrow(
      "row-level security",
    );
  });
});

describe("updateFamilyProfile", () => {
  it("updates only editable fields in the correct group", async () => {
    const result = await updateFamilyProfile(
      PROFILE_ID,
      VALUES,
    );

    expect(result).toEqual(PROFILE);

    expect(profilesQuery.update).toHaveBeenCalledWith({
      first_name: "Anna",
      age_range: "7-9",
      interests: ["music", "swimming"],
    });

    expect(profilesQuery.eq).toHaveBeenCalledWith(
      "id",
      PROFILE_ID,
    );

    expect(profilesQuery.eq).toHaveBeenCalledWith(
      "family_group_id",
      GROUP_ID,
    );
  });

  it("rejects a missing age range", async () => {
    await expect(
      updateFamilyProfile(PROFILE_ID, {
        ...VALUES,
        ageRange: null,
      }),
    ).rejects.toThrow("Age range is required");

    expect(profilesQuery.update).not.toHaveBeenCalled();
  });

  it("propagates an update error", async () => {
    profilesQuery.single.mockResolvedValue({
      data: null,
      error: new Error("Update failed"),
    });

    await expect(
      updateFamilyProfile(PROFILE_ID, VALUES),
    ).rejects.toThrow("Update failed");
  });
});



describe("deleteFamilyProfile", () => {
  it("deletes a profile from the authenticated user's group", async () => {
    profilesQuery.single.mockResolvedValue({
      data: { id: PROFILE_ID },
      error: null,
    });

    await deleteFamilyProfile(PROFILE_ID);

    expect(supabase.from).toHaveBeenCalledWith(
      "family_profiles",
    );

    expect(profilesQuery.delete).toHaveBeenCalledTimes(1);

    expect(profilesQuery.eq).toHaveBeenCalledWith(
      "id",
      PROFILE_ID,
    );

    expect(profilesQuery.eq).toHaveBeenCalledWith(
      "family_group_id",
      GROUP_ID,
    );

    expect(profilesQuery.select).toHaveBeenCalledWith("id");
  });

  it("propagates a database rejection", async () => {
    profilesQuery.single.mockResolvedValue({
      data: null,
      error: new Error(
        "The main family profile cannot be deleted",
      ),
    });

    await expect(
      deleteFamilyProfile(PROFILE_ID),
    ).rejects.toThrow(
      "The main family profile cannot be deleted",
    );
  });

  it("does not delete without authentication", async () => {
    jest.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);

    await expect(
      deleteFamilyProfile(PROFILE_ID),
    ).rejects.toThrow("You must be logged in");

    expect(profilesQuery.delete).not.toHaveBeenCalled();
  });
});
