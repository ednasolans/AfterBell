import { ScrollView, StyleSheet, Text } from 'react-native';
import { TextField } from '@/components/TextField';
import { useTechnicalSheetForm } from '../hooks/useTechnicalSheetForm';
import { Select } from '@/components/Select';    
import { PROVIDER_TYPES, PROVIDER_TYPE_LABELS } from '../types';

const providerTypeOptions = PROVIDER_TYPES.map((type) => ({
  value: type,
  label: PROVIDER_TYPE_LABELS[type],
}));

export function TechnicalSheetForm() {
  const { form, updateField } = useTechnicalSheetForm();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Basic information</Text>

      <TextField
        label="Name"
        value={form.name}
        onChangeText={(text) => updateField('name', text)}
      />
    
      <Select
          label="Provider type"
          placeholder="Select provider type"
          options={providerTypeOptions}
          value={form.providerType}
          onChange={(type) => updateField('providerType', type)}
      />

      <TextField
        label="City"
        value={form.city}
        onChangeText={(text) => updateField('city', text)}
      />
      <TextField
        label="Address"
        value={form.address}
        onChangeText={(text) => updateField('address', text)}
      />
      <TextField
        label="Phone number"
        value={form.phoneNumber}
        keyboardType="phone-pad"
        onChangeText={(text) => updateField('phoneNumber', text)}
      />
      <TextField
        label="Email"
        value={form.email}
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={(text) => updateField('email', text)}
      />
      <TextField
        label="Website"
        value={form.website}
        keyboardType="url"
        autoCapitalize="none"
        onChangeText={(text) => updateField('website', text)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
});