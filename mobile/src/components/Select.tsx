import { useState } from "react";
import { OptionsModal, type SelectOption } from "./OptionsModal";
import { SelectField } from "./SelectField";

export type { SelectOption } from "./OptionsModal";

interface SelectProps<T extends string> {
  label: string;
  options: readonly SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  placeholder: string;
  error?: string;
}

export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  placeholder,
  error,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? "";

  function handleSelect(optionValue: T) {
    onChange(optionValue);
    setIsOpen(false);
  }

  return (
    <>
      <SelectField
        label={label}
        text={selectedLabel}
        placeholder={placeholder}
        onPress={() => setIsOpen(true)}
        error={error}
      />
      <OptionsModal
        visible={isOpen}
        title={label}
        options={options}
        isSelected={(optionValue) => optionValue === value}
        onPressOption={handleSelect}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
