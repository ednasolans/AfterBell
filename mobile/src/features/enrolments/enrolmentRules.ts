import { type Activity, isFinished } from "@/lib/activity";

import {
  type ActivityPlaces,
  type EnrolmentProfile,
  type EnrolmentRequest,
  type EnrolmentStatus,
  type ReceivedEnrolmentRequest,
} from "./types";

// Same rules as send_enrolment_request. Unpublished activities never reach the
// customer, so only finished and full ones are left.
export type Availability = "available" | "finished" | "full";

export const UNAVAILABLE_MESSAGES: Record<
  Exclude<Availability, "available">,
  string
> = {
  finished: "This activity has finished, so it does not accept requests.",
  full: "This activity is full. You can ask again if a place becomes free.",
};

export function getAvailability(
  activity: Pick<Activity, "endDate" | "maxParticipants">,
  enrolledCount: number | null,
  today?: string,
): Availability {
  if (isFinished(activity, today)) {
    return "finished";
  }
  const { maxParticipants } = activity;
  if (
    maxParticipants !== null &&
    enrolledCount !== null &&
    enrolledCount >= maxParticipants
  ) {
    return "full";
  }
  return "available";
}

// A pending or accepted request holds the profile: it cannot ask again
export function isActiveStatus(status: EnrolmentStatus): boolean {
  return status === "pending" || status === "accepted";
}

export function activeRequestsFor(
  requests: EnrolmentRequest[],
  activityId: string,
): EnrolmentRequest[] {
  return requests.filter(
    (request) =>
      request.activityId === activityId && isActiveStatus(request.status),
  );
}

// The profiles that can still ask for this activity
export function profilesThatCanAsk(
  profiles: EnrolmentProfile[],
  requests: EnrolmentRequest[],
  activityId: string,
): EnrolmentProfile[] {
  const taken = new Set(
    activeRequestsFor(requests, activityId).map(
      (request) => request.familyProfileId,
    ),
  );
  return profiles.filter((profile) => !taken.has(profile.id));
}

// "8 / 12" or "3 (no limit)"
export function formatPlaces({
  takenPlaces,
  maxParticipants,
}: Pick<ActivityPlaces, "takenPlaces" | "maxParticipants">): string {
  return maxParticipants === null
    ? `${takenPlaces} (no limit)`
    : `${takenPlaces} / ${maxParticipants}`;
}

export function isFullActivity({
  availablePlaces,
}: Pick<ActivityPlaces, "availablePlaces">): boolean {
  return availablePlaces !== null && availablePlaces <= 0;
}

// Age if the profile has a date of birth, otherwise its age range
export function formatProfileAge({
  familyProfileAge,
  familyProfileAgeRange,
}: Pick<
  ReceivedEnrolmentRequest,
  "familyProfileAge" | "familyProfileAgeRange"
>): string | null {
  if (familyProfileAge !== null) {
    return `${familyProfileAge} years old`;
  }
  return familyProfileAgeRange ? `Age ${familyProfileAgeRange}` : null;
}
