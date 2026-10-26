import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { FormSubmit } from "@/components/FormSubmit";
import { MultiSelect } from "@/components/MultiSelect";
import { NumberField } from "@/components/NumberField";
import { Select, type SelectOption } from "@/components/Select";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import { TextField } from "@/components/TextField";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
  type ActivityCategory,
} from "@/lib/activityCategories";
import { AGE_RANGES, AGE_RANGE_LABELS, type AgeRange } from "@/lib/ages";
import {
  PRICE_PERIODS,
  PRICE_PERIOD_LABELS,
  parsePrice,
  type PricePeriod,
} from "@/lib/price";
import { parseInteger } from "@/lib/numbers";
import { hasErrors } from "@/lib/validation";

import { useActivityForm } from "../hooks/useActivityForm";
import { type ActivityForm as ActivityFormValues } from "../types";
import { AddressSelect } from "./AddressSelect";
import { colors } from "@/theme/colors";

const CATEGORY_OPTIONS: SelectOption<ActivityCategory>[] =
  ACTIVITY_CATEGORIES.map((category) => ({
    value: category,
    label: ACTIVITY_CATEGORY_LABELS[category],
  }));
const AGE_OPTIONS: SelectOption<AgeRange>[] = AGE_RANGES.map((age) => ({
  value: age,
  label: AGE_RANGE_LABELS[age],
}));
const PRICE_PERIOD_OPTIONS: SelectOption<PricePeriod>[] = PRICE_PERIODS.map(
  (period) => ({ value: period, label: PRICE_PERIOD_LABELS[period] }),
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
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>ACTIVITY SETUP</Text>
      <Text style={styles.title} accessibilityRole="header">
        Create an activity
      </Text>
      <Text style={styles.subtitle}>
        Share the details families need to find and choose your activity.
      </Text>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.primaryDark}
          />
        </View>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Details
        </Text>
      </View>

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

      <Select
        label="Category"
        placeholder="Choose a category"
        options={CATEGORY_OPTIONS}
        value={form.category}
        onChange={(value) => updateField("category", value)}
        error={errors.category}
      />
      <MultiSelect
        label="Age ranges"
        placeholder="Choose age ranges"
        options={AGE_OPTIONS}
        values={form.targetAgeRanges}
        onChange={(value) => updateField("targetAgeRanges", value)}
        error={errors.targetAgeRanges}
      />

      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons
            name="location-outline"
            size={20}
            color={colors.primaryDark}
          />
        </View>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Place
        </Text>
      </View>

      <AddressSelect
        value={form.addressId}
        onChange={(addressId) => updateField("addressId", addressId)}
        error={errors.addressId}
      />

      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons
            name="calendar-outline"
            size={20}
            color={colors.primaryDark}
          />
        </View>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Schedule
        </Text>
      </View>

      <ScheduleEditor
        schedule={form.schedule}
        onChange={(schedule) => updateField("schedule", schedule)}
        error={errors.schedule}
      />

      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons
            name="pricetag-outline"
            size={20}
            color={colors.primaryDark}
          />
        </View>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Price
        </Text>
      </View>

      <NumberField
        label="Price (€)"
        value={form.price}
        onChange={(value) => updateField("price", value)}
        parse={parsePrice}
        error={errors.price}
      />
      <Select
        label="Price period"
        placeholder="Choose a period"
        options={PRICE_PERIOD_OPTIONS}
        value={form.pricePeriod}
        onChange={(value) => updateField("pricePeriod", value)}
        error={errors.pricePeriod}
      />
      <NumberField
        label="Maximum participants"
        value={form.maxParticipants}
        onChange={(value) => updateField("maxParticipants", value)}
        parse={parseInteger}
        error={errors.maxParticipants}
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
  container: {
    padding: 20,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", marginTop: 4 },
  subtitle: {
    color: colors.textMuted,
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 8,
    marginBottom: 13,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "800" },
});
