import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextField } from '@/components/TextField';
import { useTechnicalSheetForm } from '../hooks/useTechnicalSheetForm';
import { Select, SelectOption } from '@/components/Select';    
import { ActivityCategory, PROVIDER_TYPES, PROVIDER_TYPE_LABELS } from '../types';
import { MultiSelect } from '@/components/MultiSelect';
import { AGE_RANGE_LABELS, AGE_RANGES, type AgeRange } from '@/lib/ages';
import { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_LABELS } from '../types';
import { ScheduleEditor } from './ScheduleEditor';
import { PriceField } from './PriceField';


const providerTypeOptions = PROVIDER_TYPES.map((type) => ({
  value: type,
  label: PROVIDER_TYPE_LABELS[type],
}));

const ageRangeOptions: SelectOption<AgeRange>[] = AGE_RANGES.map((range) => ({
  value: range,
  label: AGE_RANGE_LABELS[range],
}));

const activityCategoryOptions: SelectOption<ActivityCategory>[] = ACTIVITY_CATEGORIES.map(
  (category) => ({
    value: category,
    label: ACTIVITY_CATEGORY_LABELS[category],
  }),
);

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
      <Text style={styles.sectionTitle}>Activity</Text>

      <MultiSelect
        label="Target ages"
        placeholder="Select target ages"
        options={ageRangeOptions}
        values={form.targetAgeRanges}
        onChange={(ranges) => updateField('targetAgeRanges', ranges)}
      />
      <MultiSelect
        label="Activity"
        placeholder="Select activity"
        options={activityCategoryOptions}
        values={form.activityTypes}
        onChange={(types) => updateField('activityTypes', types)}
      />
      <ScheduleEditor
        schedule={form.schedule}
        onChange={(schedule) => updateField('schedule', schedule)}
      />
      
      <Text style={styles.sectionTitle}>Prices</Text>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <PriceField
              label="Minimum price (€)"
              value={form.priceMin}
              onChange={(value) => updateField('priceMin', value)}
            />
          </View>
          <View style={styles.rowItem}>
            <PriceField
              label="Maximum price (€)"
              value={form.priceMax}
              onChange={(value) => updateField('priceMax', value)}
            />
          </View>
        </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
});