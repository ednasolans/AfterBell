import { useLocalSearchParams } from "expo-router";

import { CatalogActivityDetail } from "@/features/catalog/components/CatalogActivityDetail";

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CatalogActivityDetail id={id} />;
}