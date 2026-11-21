import { profileAgeBounds, profileAgeLabel } from "./profileAge";

const TODAY = new Date(2026, 10, 18);

describe("profileAgeBounds", () => {
  it("uses the exact age on the given day", () => {
    expect(profileAgeBounds({ date_of_birth: "2018-03-01" }, TODAY)).toEqual({
      ageMin: 8,
      ageMax: 8,
    });
  });

  it("changes on the birthday, not the day before", () => {
    expect(profileAgeBounds({ date_of_birth: "2018-11-19" }, TODAY)).toEqual({
      ageMin: 7,
      ageMax: 7,
    });
    expect(profileAgeBounds({ date_of_birth: "2018-11-18" }, TODAY)).toEqual({
      ageMin: 8,
      ageMax: 8,
    });
  });
});

describe("profileAgeLabel", () => {
  it.each([
    ["2018-03-01", "Age 8"],
    ["2026-11-18", "Age 0"],
    ["1980-01-01", "Age 46"],
  ])("labels a profile born on %s as %s", (dateOfBirth, label) => {
    expect(profileAgeLabel({ date_of_birth: dateOfBirth }, TODAY)).toBe(label);
  });
});
