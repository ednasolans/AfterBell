import { useQuery } from "@tanstack/react-query";

import { fetchAvailableFilters } from "../api/fetchAvailableFilters";
import { catalogKeys } from "./catalogKeys";

export function useAvailableFilters() {
  return useQuery({
    queryKey: catalogKeys.availableFilters(),
    queryFn: fetchAvailableFilters,
  });
}
