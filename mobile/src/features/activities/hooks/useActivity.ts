import { useQuery } from "@tanstack/react-query";

import { fetchActivity } from "../api/fetchActivity";
import { activityKeys } from "./activityKeys";

export function useActivity(id: string) {
  return useQuery({
    queryKey: activityKeys.detail(id),
    queryFn: () => fetchActivity(id),
  });
}
