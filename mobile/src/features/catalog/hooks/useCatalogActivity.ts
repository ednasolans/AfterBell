import { useQuery } from "@tanstack/react-query";

import { fetchCatalogActivity } from "../api/fetchCatalogActivity";
import { catalogKeys } from "./catalogKeys";

export function useCatalogActivity(id: string) {
  return useQuery({
    queryKey: catalogKeys.detail(id),
    queryFn: () => fetchCatalogActivity(id),
  });
}
