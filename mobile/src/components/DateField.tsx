import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { formatDate, fromIsoDate, toIsoDate } from "@/lib/dates";
import { colors } from "@/theme/colors";

import { SelectField } from "./SelectField";

type DateFieldProps = {
  label: string;
  placeholder: string;
  // ISO date (YYYY-MM-DD), or null if it has not been chosen
  value: string | null;
  onChange: (value: string) => void;
  // The first date that can be chosen
  minimumDate?: string | null;
  // The last date that can be chosen (e.g. today for a date of birth)
  maximumDate?: string | null;
  error?: string;
};

// Android opens the system dialog; iOS shows the calendar under the field; the
// web uses the browser's date input, because the native pickers do not exist there
export function DateField({
  label,
  placeholder,
  value,
  onChange,
  minimumDate,
  maximumDate,
  error,
}: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const minimum = minimumDate ? fromIsoDate(minimumDate) : undefined;
  const maximum = maximumDate ? fromIsoDate(maximumDate) : undefined;
  const pickerDate = value
    ? fromIsoDate(value)
    : (minimum ?? maximum ?? new Date());

  if (Platform.OS === "web") {
    return (
      <WebDateField
        label={label}
        value={value}
        onChange={onChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        error={error}
      />
    );
  }

  function handleChange(date: Date) {
    setIsOpen(false);
    onChange(toIsoDate(date));
  }

  function handlePress() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: pickerDate,
        mode: "date",
        minimumDate: minimum,
        maximumDate: maximum,
        onValueChange: (_event, date) => handleChange(date),
      });
    } else {
      setIsOpen((open) => !open);
    }
  }

  return (
    <>
      <SelectField
        label={label}
        text={value ? formatDate(value) : ""}
        placeholder={placeholder}
        onPress={handlePress}
        error={error}
      />
      {isOpen ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="inline"
          // The app is always light: following a phone in dark mode would show
          // light text on a light background
          themeVariant="light"
          accentColor={colors.primary}
          minimumDate={minimum}
          maximumDate={maximum}
          onValueChange={(_event, date) => handleChange(date)}
        />
      ) : null}
    </>
  );
}

type WebDateFieldProps = Omit<DateFieldProps, "placeholder">;

// The browser already gives ISO dates (YYYY-MM-DD) and applies min and max.
// Clearing the input gives "", which is not reported: the value stays chosen.
function WebDateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  error,
}: WebDateFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <input
        type="date"
        aria-label={label}
        value={value ?? ""}
        min={minimumDate ?? undefined}
        max={maximumDate ?? undefined}
        onChange={(event) => {
          if (event.target.value) {
            onChange(event.target.value);
          }
        }}
        style={{
          ...webInputStyle,
          borderColor: error ? colors.danger : colors.border,
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

// The same look as SelectField, written as CSS for the DOM input
const webInputStyle = {
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: 14,
  padding: "10px 12px",
  fontSize: 16,
  fontFamily: "inherit",
  color: colors.text,
  backgroundColor: colors.surface,
} as const;

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
});
