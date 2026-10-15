import { Component } from "react";
import { useTechnicalSheetForm } from "../hooks/useTechnicalSheetForm";
import { Text, TextInput, View } from 'react-native';

export function TechnicalSheetForm() {
  const { form, updateField } = useTechnicalSheetForm();

  return (
    <View>
        <Text> Name </Text>
        <TextInput
            value={form.name}
            onChangeText={(text) => updateField('name', text)}
            style={{ borderWidth: 1, borderColor: '#ccc', padding: 8 }}
        />
        <Text> {form.name} </Text>
    </View>
  );
}