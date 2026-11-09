
import { supabase } from "@/lib/supabase";
import { createQueryBuilderMock } from "@/test-utils/supabaseQueryMock";
import { type TutorProfileForm } from "../types";
import {
  fetchMyTutorProfile,
  updateMyTutorProfile,
} from "./tutorProfileApi";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

const mockGetUser = jest.mocked(supabase.auth.getUser);
const mockFrom = jest.mocked(supabase.from);
const mockRpc = jest.mocked(supabase.rpc);

const form: TutorProfileForm = {
  firstName: "Anna",
  lastName: "Soler",
  presentation: "Mathematics tutor",
  street: "Carrer Major",
  number: "10",
  floor: "",
  door: "",
  postalCode: "25001",
  city: "Lleida",
  province: "Lleida",
  country: "Spain",
};

beforeEach(() => {
  jest.resetAllMocks();

  mockGetUser.mockResolvedValue({
    data: { user: { id: "tutor-a" } },
    error: null,
  } as never);
});

describe("Tutor profile API", () => {
  it("fetches the authenticated tutor sheet", async () => {
    const query = createQueryBuilderMock({
      data: { id: "sheet-a" },
      error: null,
    });
    query.limit = jest.fn().mockReturnValue(query);

    mockFrom.mockReturnValue(
      query as unknown as ReturnType<typeof supabase.from>,
    );

    await fetchMyTutorProfile();

    expect(mockFrom).toHaveBeenCalledWith("technical_sheets");
    expect(query.eq).toHaveBeenCalledWith(
      "provider_id",
      "tutor-a",
    );
    expect(query.eq).toHaveBeenCalledWith(
      "provider_type",
      "private_tutor",
    );
  });

  it("updates the profile through the RPC", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: null,
    } as never);

    await updateMyTutorProfile(form);

    expect(mockRpc).toHaveBeenCalledWith(
      "update_my_tutor_profile",
      expect.objectContaining({
        p_first_name: "Anna",
        p_last_name: "Soler",
        p_street: "Carrer Major",
        p_postal_code: "25001",
      }),
    );
  });

  it("rejects invalid data before updating", async () => {
    await expect(
      updateMyTutorProfile({ ...form, city: "" }),
    ).rejects.toThrow("Please correct");

    expect(mockRpc).not.toHaveBeenCalled();
  });

  
  it("propagates update errors", async () => {
    mockRpc.mockResolvedValue({
        data: null,
        error: new Error("Database error"),
    } as never);

    await expect(
        updateMyTutorProfile(form),
    ).rejects.toThrow("Database error");
  });


  it("requires login for profile reads", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    } as never);

    await expect(fetchMyTutorProfile()).rejects.toThrow(
      "You must be logged in",
    );
  });
});
