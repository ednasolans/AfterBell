import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MultiSelect } from "@/components/MultiSelect";
import { NumberField } from "@/components/NumberField";
import { PriceField } from "@/components/PriceField";
import { Select } from "@/components/Select";
import { categoryOptions } from "@/lib/activityCategories";
import { parseInteger } from "@/lib/numbers";
import {
  formatAmount,
  PRICE_PERIOD_LABELS,
  type PricePeriod,
} from "@/lib/price";
import { type SearchFilters } from "@/lib/searchFilters";
import { colors } from "@/theme/colors";

import { type AvailableFilters } from "../api/fetchAvailableFilters";
import { useAvailableFilters } from "../hooks/useAvailableFilters";
import { useFilterForm } from "../hooks/useFilterForm";

// The "any" option of the city and price period selectors (no filter)
const ANY = "";

type FilterPanelProps = {
  // The filters applied now
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
  onClose: () => void;
};

// Panel to choose the filters of the search. Nothing changes in the results
// until "Apply filters" is pressed with valid values.
export function FilterPanel({
  filters,
  onApply,
  onClose,
}: Readonly<FilterPanelProps>) {
  const available = useAvailableFilters();
  const { form, updateField, errors, reset, resetCount, apply } = useFilterForm(
    { initialFilters: filters, onApply },
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Filters
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close filters"
              onPress={onClose}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* A new key after a reset, so the number fields forget their text */}
          <ScrollView
            key={resetCount}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <MultiSelect
              label="Category"
              options={categoryOptions(
                available.data?.categories.map((name) => ({ name })),
              )}
              values={form.categories}
              onChange={(categories) => updateField("categories", categories)}
              placeholder="Any category"
            />

            <Text style={styles.sectionTitle} accessibilityRole="header">
              Age
            </Text>
            <View style={styles.row}>
              <View style={styles.rowField}>
                <NumberField
                  label="Minimum age"
                  value={form.ageMin}
                  onChange={(age) => updateField("ageMin", age)}
                  parse={parseInteger}
                  placeholder="0"
                />
              </View>
              <View style={styles.rowField}>
                <NumberField
                  label="Maximum age"
                  value={form.ageMax}
                  onChange={(age) => updateField("ageMax", age)}
                  parse={parseInteger}
                  placeholder="18"
                />
              </View>
            </View>
            {errors.age ? <Text style={styles.error}>{errors.age}</Text> : null}

            {available.isPending ? (
              <ActivityIndicator
                style={styles.status}
                accessibilityLabel="Loading cities and prices"
              />
            ) : null}
            {available.isError ? (
              <View style={styles.status}>
                <Text style={styles.hint}>
                  The cities and prices could not be loaded.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void available.refetch()}
                >
                  <Text style={styles.retry}>Try again</Text>
                </Pressable>
              </View>
            ) : null}
            {available.data ? (
              <CityAndPrice
                available={available.data}
                form={form}
                updateField={updateField}
                priceError={errors.price}
              />
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={reset}
              style={[styles.button, styles.resetButton]}
            >
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={apply}
              style={[styles.button, styles.applyButton]}
            >
              <Text style={styles.applyText}>Apply filters</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type CityAndPriceProps = {
  available: AvailableFilters;
  form: SearchFilters;
  updateField: <K extends keyof SearchFilters>(
    field: K,
    value: SearchFilters[K],
  ) => void;
  priceError?: string;
};

// The controls whose options come from the published activities
function CityAndPrice({
  available,
  form,
  updateField,
  priceError,
}: CityAndPriceProps) {
  const range = available.prices.find(
    (price) => price.period === form.pricePeriod,
  );

  // Prices are only compared within one period: without a period, no prices
  function changePeriod(period: PricePeriod | typeof ANY) {
    updateField("pricePeriod", period === ANY ? null : period);
    if (period === ANY) {
      updateField("priceMin", null);
      updateField("priceMax", null);
    }
  }

  return (
    <>
      <Select
        label="City"
        options={[
          { value: ANY, label: "Any city" },
          ...available.cities.map((city) => ({ value: city, label: city })),
        ]}
        value={form.city ?? ANY}
        onChange={(city) => updateField("city", city === ANY ? null : city)}
        placeholder="Any city"
      />

      <Select<PricePeriod | typeof ANY>
        label="Price period"
        options={[
          { value: ANY, label: "Any price" },
          ...available.prices.map(({ period }) => ({
            value: period,
            label: PRICE_PERIOD_LABELS[period],
          })),
        ]}
        value={form.pricePeriod ?? ANY}
        onChange={changePeriod}
        placeholder="Any price"
      />
      {range ? (
        <>
          <Text style={styles.hint}>
            {`Prices ${PRICE_PERIOD_LABELS[range.period].toLowerCase()} go from ${formatAmount(range.min)} € to ${formatAmount(range.max)} €.`}
          </Text>
          <View style={styles.row}>
            <View style={styles.rowField}>
              <PriceField
                label="Minimum price"
                value={form.priceMin}
                onChange={(price) => updateField("priceMin", price)}
              />
            </View>
            <View style={styles.rowField}>
              <PriceField
                label="Maximum price"
                value={form.priceMax}
                onChange={(price) => updateField("priceMax", price)}
              />
            </View>
          </View>
        </>
      ) : null}
      {priceError ? <Text style={styles.error}>{priceError}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    maxHeight: "90%",
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.text },
  content: { padding: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  row: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1 },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 16,
  },
  hint: { color: colors.textMuted, marginBottom: 12 },
  status: { alignItems: "center", paddingVertical: 12, gap: 6 },
  retry: { color: colors.primaryDark, fontWeight: "700" },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
  },
  resetButton: { backgroundColor: colors.primarySoft },
  resetText: { color: colors.primaryDark, fontWeight: "700" },
  applyButton: { backgroundColor: colors.primary },
  applyText: { color: colors.white, fontWeight: "700" },
});
