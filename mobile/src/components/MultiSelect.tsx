import { useState } from "react";
import { toggleItemInArray } from "../lib/arrays";
import { OptionsModal, type SelectOption } from "./OptionsModal";
import { SelectField } from "./SelectField";

interface MultiSelectProps<T extends string> {
  label: string;
  options: readonly SelectOption<T>[];
  values: readonly T[];
  onChange: (values: T[]) => void;
  placeholder: string;
  error?: string;
}

export function MultiSelect<T extends string>({
  label,
  options,
  values,
  onChange,
  placeholder,
  error,
}: MultiSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabels = options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label)
    .join(", ");

  return (
    <>
      <SelectField
        label={label}
        text={selectedLabels}
        placeholder={placeholder}
        onPress={() => setIsOpen(true)}
        error={error}
      />
      <OptionsModal
        visible={isOpen}
        title={label}
        options={options}
        isSelected={(optionValue) => values.includes(optionValue)}
        onPressOption={(optionValue) =>
          onChange(toggleItemInArray(values, optionValue))
        }
        onClose={() => setIsOpen(false)}
        multiple
      />
    </>
  );
}
