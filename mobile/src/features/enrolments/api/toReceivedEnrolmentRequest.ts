import { type Database } from "@/lib/database.types";

import { type EnrolmentStatus, type ReceivedEnrolmentRequest } from "../types";

export type ReceivedEnrolmentRequestRow =
  Database["public"]["Functions"]["provider_enrolment_requests"]["Returns"][number];

// The generated types say every column of a function is set, but the age,
// the age range and the message can be null
export function toReceivedEnrolmentRequest(
  row: ReceivedEnrolmentRequestRow,
): ReceivedEnrolmentRequest {
  return {
    id: row.id,
    activityId: row.activity_id,
    activityTitle: row.activity_title,
    familyProfileName: row.family_profile_name,
    familyProfileAge: (row.family_profile_age as number | null) ?? null,
    familyProfileAgeRange:
      (row.family_profile_age_range as string | null) ?? null,
    customerEmail: row.customer_email,
    message: (row.message as string | null) ?? null,
    // The CHECK constraint guarantees that status is one of ENROLMENT_STATUSES
    status: row.status as EnrolmentStatus,
    createdAt: row.created_at,
  };
}
