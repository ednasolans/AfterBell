import { router } from "expo-router";

import { TechnicalSheetForm } from "@/features/technical-sheet/components/TechnicalSheetForm";

export default function TechnicalSheetScreen() {
  return <TechnicalSheetForm onSaved={() => router.back()} />;
}