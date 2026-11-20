import { CustomerActivityCard } from "@/components/CustomerActivityCard";

import { type Recommendation } from "../types";

type RecommendationCardProps = {
  recommendation: Recommendation;
  onOpen: (id: string) => void;
};

// The activity card, saying which family profiles the activity fits
export function RecommendationCard({
  recommendation,
  onOpen,
}: Readonly<RecommendationCardProps>) {
  const { activity } = recommendation;
  return (
    <CustomerActivityCard
      activity={activity}
      providerName={recommendation.providerName}
      schedule={activity.schedule}
      suitableFor={recommendation.matchedProfiles.map(
        (profile) => profile.firstName,
      )}
      onPress={() => onOpen(activity.id)}
    />
  );
}
