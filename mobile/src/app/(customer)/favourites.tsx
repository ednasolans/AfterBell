import { router } from "expo-router";

import { FavouritesList } from "@/features/catalog/components/FavouritesList";

export default function FavouritesScreen() {
  return (
    <FavouritesList
      onOpen={(id) =>
        router.push({ pathname: "/activities/[id]", params: { id } })
      }
      onExplore={() => router.back()}
    />
  );
}
