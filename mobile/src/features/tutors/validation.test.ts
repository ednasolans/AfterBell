
import { type TutorRegistration } from "./types";
import {
  validateTutorProfile,
  validateTutorRegistration,
} from "./validation";

const valid: TutorRegistration = {
  email: "anna@test.com",
  password: "password123",
  firstName: "Anna",
  lastName: "Soler",
  presentation: "I teach mathematics.",
  street: "Carrer Major",
  number: "10",
  floor: "",
  door: "",
  postalCode: "25001",
  city: "Lleida",
  province: "Lleida",
  country: "Spain",
};

describe("Tutor validation", () => {
  it("accepts a valid tutor", () => {
    expect(validateTutorRegistration(valid)).toEqual({});
  });

  it("rejects missing required fields", () => {
    const errors = validateTutorProfile({
      ...valid,
      firstName: "",
      lastName: "",
      presentation: "",
      street: "",
      number: "",
      city: "",
      province: "",
      postalCode: "",
    });

    expect(errors.firstName).toBeDefined();
    expect(errors.lastName).toBeDefined();
    expect(errors.presentation).toBeDefined();
    expect(errors.street).toBeDefined();
    expect(errors.number).toBeDefined();
    expect(errors.city).toBeDefined();
    expect(errors.province).toBeDefined();
    expect(errors.postalCode).toBeDefined();
  });

  it.each(["1234", "99999", "ABCDE", "00000"])(
    "rejects invalid postal code %s",
    (postalCode) => {
      const errors = validateTutorProfile({
        ...valid,
        postalCode,
      });
      expect(errors.postalCode).toBeDefined();
    },
  );

  it("accepts postal codes with leading zeroes", () => {
    expect(
      validateTutorProfile({
        ...valid,
        postalCode: "08001",
      }),
    ).toEqual({});
  });

  it("rejects overlong names and presentation", () => {
    const errors = validateTutorProfile({
      ...valid,
      firstName: "A".repeat(51),
      lastName: "B".repeat(51),
      presentation: "C".repeat(501),
    });

    expect(errors.firstName).toBeDefined();
    expect(errors.lastName).toBeDefined();
    expect(errors.presentation).toBeDefined();
  });

  it("rejects invalid authentication data", () => {
    const errors = validateTutorRegistration({
      ...valid,
      email: "wrong",
      password: "123",
    });

    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});
