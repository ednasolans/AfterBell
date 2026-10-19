import { Alert } from "react-native";

import { TechnicalSheetForm } from "../features/technical-sheet/components/TechnicalSheetForm";

export default function TechnicalSheetPreviewScreen() {
  return (
    <TechnicalSheetForm
      onSaved={() =>
        Alert.alert("Saved", "The technical sheet has been saved.")
      }
    />
  );
}
