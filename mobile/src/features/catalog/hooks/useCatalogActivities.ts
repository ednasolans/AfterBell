import { useQuery } from "@tanstack/react-query";

import { fetchCatalogActivities } from "../api/fetchCatalogActivities";
import { useFavouritesProfileId } from "../favouritesProfile";
import { catalogKeys } from "./catalogKeys";

export function useCatalogActivities() {
  const profileId = useFavouritesProfileId();
  return useQuery({
    queryKey: catalogKeys.list(profileId),
    queryFn: () => fetchCatalogActivities(profileId),
  });
}
