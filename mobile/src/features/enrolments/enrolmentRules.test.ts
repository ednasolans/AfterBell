import {
  activeRequestsFor,
  formatPlaces,
  formatProfileAge,
  getAvailability,
  isActiveStatus,
  isFullActivity,
  profilesThatCanAsk,
} from "./enrolmentRules";
import { type EnrolmentRequest } from "./types";

const TODAY = "2027-07-15";
const OPEN = { endDate: null, maxParticipants: 10 };

const REQUEST: EnrolmentRequest = {
  id: "r1",
  activityId: "a1",
  activityTitle: "Swimming",
  activityAvailable: true,
  familyProfileId: "anna",
  familyProfileName: "Anna",
  message: null,
  status: "pending",
  createdAt: "2027-07-01T10:00:00Z",
};

describe("getAvailability", () => {
  it("is available with free places", () => {
    expect(getAvailability(OPEN, 3, TODAY)).toBe("available");
  });

  it("is full when every place is taken", () => {
    expect(getAvailability(OPEN, 10, TODAY)).toBe("full");
  });

  it("is never full without a limit", () => {
    expect(
      getAvailability({ ...OPEN, maxParticipants: null }, 500, TODAY),
    ).toBe("available");
  });

  it("is available when the places could not be read", () => {
    expect(getAvailability(OPEN, null, TODAY)).toBe("available");
  });

  it("is finished from the day after the end date", () => {
    expect(getAvailability({ ...OPEN, endDate: "2027-07-14" }, 0, TODAY)).toBe(
      "finished",
    );
    expect(getAvailability({ ...OPEN, endDate: TODAY }, 0, TODAY)).toBe(
      "available",
    );
  });
});

describe("isActiveStatus", () => {
  it.each([
    ["pending", true],
    ["accepted", true],
    ["rejected", false],
    ["cancelled", false],
  ] as const)("%s is active: %s", (status, expected) => {
    expect(isActiveStatus(status)).toBe(expected);
  });
});

describe("requests of an activity", () => {
  const requests: EnrolmentRequest[] = [
    REQUEST,
    { ...REQUEST, id: "r2", familyProfileId: "pau", status: "rejected" },
    { ...REQUEST, id: "r3", activityId: "a2", familyProfileId: "marc" },
  ];
  const profiles = [
    { id: "anna", firstName: "Anna" },
    { id: "pau", firstName: "Pau" },
    { id: "marc", firstName: "Marc" },
  ];

  it("keeps the active requests of that activity", () => {
    expect(activeRequestsFor(requests, "a1").map((r) => r.id)).toEqual(["r1"]);
  });

  it("lets ask the profiles without an active request for it", () => {
    expect(
      profilesThatCanAsk(profiles, requests, "a1").map((p) => p.id),
    ).toEqual(["pau", "marc"]);
  });
});

describe("places of an activity", () => {
  it("shows the places taken against the maximum", () => {
    expect(formatPlaces({ takenPlaces: 8, maxParticipants: 12 })).toBe(
      "8 / 12",
    );
  });

  it("shows the places taken of an activity without limit", () => {
    expect(formatPlaces({ takenPlaces: 3, maxParticipants: null })).toBe(
      "3 (no limit)",
    );
  });

  it("is full when no place is left, never without limit", () => {
    expect(isFullActivity({ availablePlaces: 0 })).toBe(true);
    expect(isFullActivity({ availablePlaces: 2 })).toBe(false);
    expect(isFullActivity({ availablePlaces: null })).toBe(false);
  });
});

describe("formatProfileAge", () => {
  it("prefers the age from the date of birth", () => {
    expect(
      formatProfileAge({ familyProfileAge: 8, familyProfileAgeRange: "7-9" }),
    ).toBe("8 years old");
  });

  it("uses the age range when there is no date of birth", () => {
    expect(
      formatProfileAge({
        familyProfileAge: null,
        familyProfileAgeRange: "7-9",
      }),
    ).toBe("Age 7-9");
  });

  it("returns nothing when there is neither", () => {
    expect(
      formatProfileAge({ familyProfileAge: null, familyProfileAgeRange: null }),
    ).toBeNull();
  });
});
