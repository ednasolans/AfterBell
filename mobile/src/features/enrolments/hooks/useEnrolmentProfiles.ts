import { useQuery } from "@tanstack/react-query";

import { fetchEnrolmentProfiles } from "../api/fetchEnrolmentProfiles";
import { enrolmentProfilesKey } from "./enrolmentKeys";

export function useEnrolmentProfiles() {
  return useQuery({
    queryKey: enrolmentProfilesKey,
    queryFn: fetchEnrolmentProfiles,
  });
}
