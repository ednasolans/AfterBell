import { useQuery } from "@tanstack/react-query";

import { fetchCatalogActivity } from "../api/fetchCatalogActivity";
import { useFavouritesProfileId } from "../favouritesProfile";
import { catalogKeys } from "./catalogKeys";

export function useCatalogActivity(id: string) {
  const profileId = useFavouritesProfileId();
  return useQuery({
    queryKey: catalogKeys.detail(id, profileId),
    queryFn: () => fetchCatalogActivity(id, profileId),
  });
}
