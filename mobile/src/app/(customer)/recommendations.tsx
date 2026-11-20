import { router } from "expo-router";

import { useActiveProfile } from "@/features/family-profiles/context/ActiveProfileProvider";
import { RecommendationsList } from "@/features/recommendations/components/RecommendationsList";

export default function RecommendationsScreen() {
  const activeProfile = useActiveProfile();
  return (
    <RecommendationsList
      profileId={activeProfile.activeProfileId}
      profileReady={!activeProfile.isLoading}
      onOpen={(id) =>
        router.push({ pathname: "/activities/[id]", params: { id } })
      }
    />
  );
}
