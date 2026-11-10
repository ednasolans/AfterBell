import {
  activeRequestsFor,
  getAvailability,
  isActiveStatus,
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
