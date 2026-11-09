
import { supabase } from "@/lib/supabase";
import { type TutorRegistration } from "../types";
import { registerTutor } from "./registerTutor";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { signUp: jest.fn() },
  },
}));

const mockSignUp = jest.mocked(supabase.auth.signUp);

const valid: TutorRegistration = {
  email: "anna@test.com",
  password: "password123",
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
  mockSignUp.mockReset();
});

describe("registerTutor", () => {
  it("registers a tutor with structured address", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    await registerTutor(valid);

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "anna@test.com",
      password: "password123",
      options: {
        data: {
          account_type: "tutor",
          first_name: "Anna",
          last_name: "Soler",
          presentation: "Mathematics tutor",
          street: "Carrer Major",
          number: "10",
          floor: null,
          door: null,
          postal_code: "25001",
          city: "Lleida",
          province: "Lleida",
          country: "Spain",
        },
      },
    });
  });

  it("does not send invalid data to Auth", async () => {
    await expect(
      registerTutor({ ...valid, street: "" }),
    ).rejects.toThrow("Please correct");

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("propagates Supabase registration errors", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    } as never);

    await expect(registerTutor(valid)).rejects.toMatchObject({
      message: "User already registered",
    });
  });
});
