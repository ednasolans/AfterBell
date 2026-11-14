import { useQuery } from "@tanstack/react-query";

import { fetchProfileIsOutdated } from "../api/fetchProfileIsOutdated";
import { profileKeys } from "./profileKeys";

export function useProfileIsOutdated() {
  return useQuery({
    queryKey: profileKeys.outdated(),
    queryFn: fetchProfileIsOutdated,
  });
}
