import { useQuery } from "@tanstack/react-query";

import { fetchMyEnrolmentRequests } from "../api/fetchMyEnrolmentRequests";
import { enrolmentKeys } from "./enrolmentKeys";

export function useMyEnrolmentRequests() {
  return useQuery({
    queryKey: enrolmentKeys.mine(),
    queryFn: fetchMyEnrolmentRequests,
  });
}
