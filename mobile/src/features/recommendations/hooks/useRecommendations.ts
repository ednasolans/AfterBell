import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchRecommendations } from "../api/fetchRecommendations";
import { recommendationKeys } from "@/lib/recommendationKeys";

// Short cache: the recommendations are not recalculated every time the screen
// is shown. There is no cache in the Edge Function (see docs/features/recommendations.md).
export const RECOMMENDATIONS_STALE_MS = 5 * 60_000;

// The pages of the recommendations, loaded one after another. The function
// says whether there is a next page.
export function useRecommendations(enabled = true) {
  return useInfiniteQuery({
    queryKey: recommendationKeys.all,
    queryFn: ({ pageParam }) => fetchRecommendations(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length : undefined,
    staleTime: RECOMMENDATIONS_STALE_MS,
    enabled,
  });
}
