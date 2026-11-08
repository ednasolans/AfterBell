import { useQuery } from "@tanstack/react-query";

import { fetchPublicationIssues } from "../api/fetchPublicationIssues";
import { activityKeys } from "./activityKeys";

export function usePublicationIssues(activityId: string) {
  return useQuery({
    queryKey: activityKeys.publicationIssues(activityId),
    queryFn: () => fetchPublicationIssues(activityId),
  });
}
