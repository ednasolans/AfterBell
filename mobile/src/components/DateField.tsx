import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform } from "react-native";

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
  error?: string;
};

// Android opens the system dialog; iOS shows the calendar under the field
export function DateField({
  label,
  placeholder,
  value,
  onChange,
  minimumDate,
  error,
}: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const minimum = minimumDate ? fromIsoDate(minimumDate) : undefined;
  const pickerDate = value ? fromIsoDate(value) : (minimum ?? new Date());

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
          onValueChange={(_event, date) => handleChange(date)}
        />
      ) : null}
    </>
  );
}
