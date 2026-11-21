import { CustomerActivityCard } from "@/components/CustomerActivityCard";
import { type TimeSlot } from "@/lib/schedule";

import { type CatalogCardActivity } from "../types";
import { FavouriteButton } from "./FavouriteButton";

type CatalogActivityCardProps = {
  activity: CatalogCardActivity;
  providerName: string | null;
  isFavourite: boolean;
  // A favourite that can no longer be opened: marked, and only its heart works
  unavailable?: boolean;
  // Not known in the favourites list
  schedule?: readonly TimeSlot[];
  onPress: () => void;
};

// The activity card of the catalog, with the heart of the active profile
export function CatalogActivityCard({
  isFavourite,
  ...cardProps
}: Readonly<CatalogActivityCardProps>) {
  return (
    <CustomerActivityCard
      {...cardProps}
      accessory={
        <FavouriteButton
          activityId={cardProps.activity.id}
          activityTitle={cardProps.activity.title}
          isFavourite={isFavourite}
        />
      }
    />
  );
}
