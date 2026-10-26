import { useQuery } from "@tanstack/react-query";

import { fetchCatalogActivities } from "../api/fetchCatalogActivities";
import { catalogKeys } from "./catalogKeys";

export function useCatalogActivities() {
  return useQuery({
    queryKey: catalogKeys.list(),
    queryFn: fetchCatalogActivities,
  });
}
