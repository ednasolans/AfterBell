import { useQuery } from "@tanstack/react-query";

import { fetchActivityPlaces } from "../api/fetchActivityPlaces";
import { enrolmentKeys } from "./enrolmentKeys";

// The places of every activity of the provider. Every card and the requests
// screen share this one query.
export function useActivityPlaces() {
  return useQuery({
    queryKey: enrolmentKeys.places(),
    queryFn: fetchActivityPlaces,
  });
}
