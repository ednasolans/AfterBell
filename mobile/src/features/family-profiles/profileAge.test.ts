import { profileAgeBounds, profileAgeLabel } from "./profileAge";

const TODAY = new Date(2026, 10, 18);

describe("profileAgeBounds", () => {
  it("uses the exact age when the date of birth is known", () => {
    expect(
      profileAgeBounds(
        { date_of_birth: "2018-03-01", age_range: "4-6" },
        TODAY,
      ),
    ).toEqual({ ageMin: 8, ageMax: 8 });
  });

  it("uses the age range without a date of birth", () => {
    expect(
      profileAgeBounds({ date_of_birth: null, age_range: "7-9" }, TODAY),
    ).toEqual({ ageMin: 7, ageMax: 9 });
  });

  it("has no maximum for adults", () => {
    expect(
      profileAgeBounds({ date_of_birth: null, age_range: "adult" }, TODAY),
    ).toEqual({ ageMin: 18, ageMax: null });
  });

  it("is null without an age, or with an unknown range", () => {
    expect(
      profileAgeBounds({ date_of_birth: null, age_range: null }, TODAY),
    ).toBeNull();
    expect(
      profileAgeBounds({ date_of_birth: null, age_range: "99-100" }, TODAY),
    ).toBeNull();
  });
});

describe("profileAgeLabel", () => {
  it.each([
    [{ date_of_birth: "2018-03-01", age_range: null }, "Age 8"],
    [{ date_of_birth: null, age_range: "7-9" }, "7–9 years"],
    [{ date_of_birth: null, age_range: "adult" }, "Adults"],
    [{ date_of_birth: null, age_range: null }, null],
  ])("labels %j as %s", (profile, label) => {
    expect(profileAgeLabel(profile, TODAY)).toBe(label);
  });
});
