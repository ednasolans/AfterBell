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
