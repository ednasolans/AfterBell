import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { TextField } from "@/components/TextField";
import { useTechnicalSheetForm } from "../hooks/useTechnicalSheetForm";
import { Select, SelectOption } from "@/components/Select";
import {
  PROVIDER_TYPES,
  PROVIDER_TYPE_LABELS,
  FACILITIES,
  FACILITY_LABELS,
  type Facility,
} from "../types";
import { MultiSelect } from "@/components/MultiSelect";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
  type ActivityCategory,
} from "@/lib/activityCategories";
import { hasErrors } from "../validation";

const providerTypeOptions = PROVIDER_TYPES.map((type) => ({
  value: type,
  label: PROVIDER_TYPE_LABELS[type],
}));

const activityCategoryOptions: SelectOption<ActivityCategory>[] =
  ACTIVITY_CATEGORIES.map((category) => ({
    value: category,
    label: ACTIVITY_CATEGORY_LABELS[category],
  }));

const FACILITY_OPTIONS: SelectOption<Facility>[] = FACILITIES.map(
  (facility) => ({
    value: facility,
    label: FACILITY_LABELS[facility],
  }),
);

type TechnicalSheetFormProps = {
  onSaved?: () => void;
};

export function TechnicalSheetForm({ onSaved }: TechnicalSheetFormProps) {
  const { form, updateField, errors, isSaving, saveError, submit } =
    useTechnicalSheetForm();

  async function handleSave() {
    const saved = await submit();
    if (saved) {
      onSaved?.();
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Basic information
      </Text>

      <TextField
        label="Name"
        value={form.name}
        onChangeText={(text) => updateField("name", text)}
        error={errors.name}
      />

      <Select
        label="Provider type"
        placeholder="Select provider type"
        options={providerTypeOptions}
        value={form.providerType}
        onChange={(type) => updateField("providerType", type)}
        error={errors.providerType}
      />

      <TextField
        label="City"
        value={form.city}
        onChangeText={(text) => updateField("city", text)}
        error={errors.city}
      />
      <TextField
        label="Address"
        value={form.address}
        onChangeText={(text) => updateField("address", text)}
        error={errors.address}
      />
      <TextField
        label="Phone number"
        value={form.phoneNumber}
        keyboardType="phone-pad"
        onChangeText={(text) => updateField("phoneNumber", text)}
        error={errors.phoneNumber}
      />
      <TextField
        label="Email"
        value={form.email}
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={(text) => updateField("email", text)}
        error={errors.email}
      />
      <TextField
        label="Website"
        value={form.website}
        keyboardType="url"
        autoCapitalize="none"
        onChangeText={(text) => updateField("website", text)}
        error={errors.website}
      />
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Activity
      </Text>

      <MultiSelect
        label="Activity"
        placeholder="Select activity"
        options={activityCategoryOptions}
        values={form.activityTypes}
        onChange={(types) => updateField("activityTypes", types)}
        error={errors.activityTypes}
      />

      <Text style={styles.sectionTitle} accessibilityRole="header">
        Facilities
      </Text>

      <MultiSelect
        label="Facilities"
        values={form.facilities}
        options={FACILITY_OPTIONS}
        onChange={(values) => updateField("facilities", values)}
        placeholder="Choose the facilities you offer"
      />

      {hasErrors(errors) ? (
        <Text style={styles.formError}>
          Please fix the errors above before saving.
        </Text>
      ) : null}

      {saveError ? <Text style={styles.formError}>{saveError}</Text> : null}

      <Pressable
        onPress={handleSave}
        disabled={isSaving}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSaving, busy: isSaving }}
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  formError: {
    color: "#c00",
    marginTop: 8,
    textAlign: "center",
  },
  saveButton: {
    marginTop: 16,
    marginBottom: 32,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#2563eb",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
