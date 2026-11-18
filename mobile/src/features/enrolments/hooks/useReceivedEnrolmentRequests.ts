import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchReceivedEnrolmentRequests } from "../api/fetchReceivedEnrolmentRequests";
import { type ReceivedRequestFilters } from "../types";
import { enrolmentKeys } from "./enrolmentKeys";

export function useReceivedEnrolmentRequests(filters: ReceivedRequestFilters) {
  return useQuery({
    queryKey: enrolmentKeys.receivedList(filters),
    queryFn: () => fetchReceivedEnrolmentRequests(filters),
    // Changing a filter keeps the current list on screen while the new one loads
    placeholderData: keepPreviousData,
  });
}
