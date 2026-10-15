import { useTechnicalSheetForm } from "../hooks/useTechnicalSheetForm";
import { View } from 'react-native';
import { TextField } from "@/components/TextField";

export function TechnicalSheetForm() {
  const { form, updateField } = useTechnicalSheetForm();

  return (
    <View style={{ padding: 16 }}>
        <TextField
            label="Name"
            value={form.name}
            onChangeText={(text) => updateField('name', text)}
        />
    </View>
  );
}