import { ScrollView, StyleSheet, Text, View } from "react-native";

import { FormSubmit } from "@/components/FormSubmit";
import { NumberField } from "@/components/NumberField";
import { Select, type SelectOption } from "@/components/Select";
import { TextField } from "@/components/TextField";
import { parseInteger } from "@/lib/numbers";
import { hasErrors } from "@/lib/validation";

import { useActivityForm } from "../hooks/useActivityForm";
import {
  ACTIVITY_STATUSES,
  type ActivityForm as ActivityFormValues,
  type ActivityStatus,
} from "../types";
import { AddressSelect } from "./AddressSelect";

const STATUS_LABELS: Record<ActivityStatus, string> = {
  draft: "Draft (only you can see it)",
  published: "Published (customers can see it)",
};

const STATUS_OPTIONS: SelectOption<ActivityStatus>[] = ACTIVITY_STATUSES.map(
  (status) => ({
    value: status,
    label: STATUS_LABELS[status],
  }),
);

type ActivityFormProps = {
  // Starting values: empty to create, the saved activity to edit
  initialForm?: ActivityFormValues;
  submitLabel: string;
  // Saves the activity (e.g. mutateAsync of a mutation); it must throw if saving fails
  onSubmit: (form: ActivityFormValues) => Promise<unknown>;
  isSaving: boolean;
  saveFailed: boolean;
  onSaved?: () => void;
};

export function ActivityForm({
  initialForm,
  submitLabel,
  onSubmit,
  isSaving,
  saveFailed,
  onSaved,
}: ActivityFormProps) {
  const { form, updateField, errors, submit } = useActivityForm({
    initialForm,
    onSubmit,
  });

  async function handleSave() {
    const saved = await submit();
    if (saved) {
      onSaved?.();
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Details
      </Text>

      <TextField
        label="Title"
        value={form.title}
        onChangeText={(text) => updateField("title", text)}
        error={errors.title}
      />
      <TextField
        label="Description"
        value={form.description}
        onChangeText={(text) => updateField("description", text)}
        error={errors.description}
        multiline
      />

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <NumberField
            label="Minimum age"
            placeholder="e.g. 7"
            value={form.minAge}
            onChange={(value) => updateField("minAge", value)}
            parse={parseInteger}
            error={errors.minAge}
          />
        </View>
        <View style={styles.rowItem}>
          <NumberField
            label="Maximum age"
            placeholder="e.g. 12"
            value={form.maxAge}
            onChange={(value) => updateField("maxAge", value)}
            parse={parseInteger}
            error={errors.maxAge}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle} accessibilityRole="header">
        Place
      </Text>

      <AddressSelect
        value={form.addressId}
        onChange={(addressId) => updateField("addressId", addressId)}
        error={errors.addressId}
      />

      <Text style={styles.sectionTitle} accessibilityRole="header">
        Schedule
      </Text>

      <TextField
        label="Time slots (one per line)"
        value={form.schedule.join("\n")}
        onChangeText={(text) => updateField("schedule", text.split("\n"))}
        error={errors.schedule}
        multiline
      />
      <View style={styles.row}>
        <View style={styles.rowItem}>
          <TextField
            label="Start date (YYYY-MM-DD)"
            value={form.startDate}
            onChangeText={(text) => updateField("startDate", text)}
            error={errors.startDate}
          />
        </View>
        <View style={styles.rowItem}>
          <TextField
            label="End date (YYYY-MM-DD)"
            value={form.endDate}
            onChangeText={(text) => updateField("endDate", text)}
            error={errors.endDate}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle} accessibilityRole="header">
        Price
      </Text>

      <NumberField
        label="Price (€)"
        placeholder="0 if it is free"
        value={form.price}
        onChange={(value) => updateField("price", value)}
        parse={parseInteger}
        error={errors.price}
      />

      <Text style={styles.sectionTitle} accessibilityRole="header">
        Visibility
      </Text>

      <Select
        label="Status"
        placeholder="Choose a status"
        options={STATUS_OPTIONS}
        value={form.status}
        onChange={(status) => updateField("status", status)}
        error={errors.status}
      />

      <FormSubmit
        label={submitLabel}
        onPress={handleSave}
        isSaving={isSaving}
        hasFieldErrors={hasErrors(errors)}
        saveError={
          saveFailed
            ? "The activity could not be saved. Please try again."
            : null
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", gap: 12 },
  rowItem: { flex: 1 },
});