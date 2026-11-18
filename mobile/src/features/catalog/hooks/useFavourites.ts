import { useQuery } from "@tanstack/react-query";

import { fetchFavourites } from "../api/fetchFavourites";
import { catalogKeys } from "./catalogKeys";

export function useFavourites() {
  return useQuery({
    queryKey: catalogKeys.favourites(),
    queryFn: fetchFavourites,
  });
}
