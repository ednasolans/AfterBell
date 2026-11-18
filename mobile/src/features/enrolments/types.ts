// Same values as the CHECK of enrolment_requests.status
export const ENROLMENT_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
] as const;
export type EnrolmentStatus = (typeof ENROLMENT_STATUSES)[number];

export const ENROLMENT_STATUS_LABELS: Record<EnrolmentStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// A request of the logged-in family, as the app uses it
export interface EnrolmentRequest {
  id: string;
  activityId: string;
  activityTitle: string;
  // False when the activity has been unpublished or has finished
  activityAvailable: boolean;
  familyProfileId: string;
  familyProfileName: string;
  message: string | null;
  status: EnrolmentStatus;
  createdAt: string;
}

// A family profile that can attend an activity
export interface EnrolmentProfile {
  id: string;
  firstName: string;
}

// What the family fills in to ask for a place
export interface EnrolmentRequestForm {
  profileIds: string[];
  message: string;
}

export const EMPTY_ENROLMENT_REQUEST_FORM: EnrolmentRequestForm = {
  profileIds: [],
  message: "",
};

// A request received by the logged-in provider. Only what the provider needs:
// the first name and age of the profile, and the email of the family.
export interface ReceivedEnrolmentRequest {
  id: string;
  activityId: string;
  activityTitle: string;
  familyProfileName: string;
  // From the date of birth; null when the profile only has an age range
  familyProfileAge: number | null;
  familyProfileAgeRange: string | null;
  customerEmail: string;
  message: string | null;
  status: EnrolmentStatus;
  createdAt: string;
}

// The places of one activity of the provider
export interface ActivityPlaces {
  activityId: string;
  activityTitle: string;
  // Null when the activity has no limit
  maxParticipants: number | null;
  takenPlaces: number;
  availablePlaces: number | null;
}

// Null shows every activity or every status
export interface ReceivedRequestFilters {
  activityId: string | null;
  status: EnrolmentStatus | null;
}

export type EnrolmentAnswer = "accept" | "reject";
