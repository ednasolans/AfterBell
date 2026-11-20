import { router } from "expo-router";

import { RecommendationsList } from "@/features/recommendations/components/RecommendationsList";

export default function RecommendationsScreen() {
  return (
    <RecommendationsList
      onOpen={(id) =>
        router.push({ pathname: "/activities/[id]", params: { id } })
      }
    />
  );
}
