import { skipToken, useQuery } from "@tanstack/react-query";

import { fetchFavourites } from "../api/fetchFavourites";
import { useFavouritesProfileId } from "../favouritesProfile";
import { catalogKeys } from "./catalogKeys";

// The favourites of the active profile. Without a profile there is nothing
// to load (skipToken), and the list says how to add one.
export function useFavourites() {
  const profileId = useFavouritesProfileId();
  return useQuery({
    queryKey: catalogKeys.favourites(profileId),
    queryFn: profileId ? () => fetchFavourites(profileId) : skipToken,
  });
}
