import { ScrollView, StyleSheet, Text } from 'react-native';
import { TextField } from '@/components/TextField';
import { useTechnicalSheetForm } from '../hooks/useTechnicalSheetForm';

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