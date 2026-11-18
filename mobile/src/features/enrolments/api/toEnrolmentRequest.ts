import { type Database } from "@/lib/database.types";

import { type EnrolmentRequest, type EnrolmentStatus } from "../types";

export type EnrolmentRequestRow =
  Database["public"]["Functions"]["my_enrolment_requests"]["Returns"][number];

export function toEnrolmentRequest(row: EnrolmentRequestRow): EnrolmentRequest {
  return {
    id: row.id,
    activityId: row.activity_id,
    activityTitle: row.activity_title,
    activityAvailable: row.activity_available,
    familyProfileId: row.family_profile_id,
    familyProfileName: row.family_profile_name,
    message: row.message,
    // The CHECK constraint guarantees that status is one of ENROLMENT_STATUSES
    status: row.status as EnrolmentStatus,
    createdAt: row.created_at,
  };
}
