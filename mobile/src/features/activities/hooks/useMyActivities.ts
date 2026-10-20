import { useQuery } from "@tanstack/react-query";

import { fetchMyActivities } from "../api/fetchMyActivities";
import { activityKeys } from "./activityKeys";

export function useMyActivities() {
  return useQuery({
    queryKey: activityKeys.mine(),
    queryFn: fetchMyActivities,
  });
}
