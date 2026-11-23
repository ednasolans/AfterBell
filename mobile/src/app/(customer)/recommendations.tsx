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
      actions={{
        setTown: () => router.push("/family-location"),
        addProfile: () => router.push("/family-profile-form"),
        completeProfile: () =>
          router.push({
            pathname: "/family-profile-form",
            params: { id: activeProfile.activeProfileId ?? undefined },
          }),
        // The search and the list of every activity are on the home
        searchActivities: () => router.back(),
        seeAllActivities: () => router.back(),
      }}
    />
  );
}
