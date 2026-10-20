import { useState } from "react";
import { type KeyboardTypeOptions } from "react-native";

import { TextField } from "@/components/TextField";

type NumberFieldProps = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  // Converts the typed text into a number, or null if it is not valid (yet)
  parse: (text: string) => number | null;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
};

// Text input for a number. The text can be incomplete while typing ("30,"),
// so it lives here; the form only receives the parsed number (or null).
export function NumberField({
  label,
  value,
  onChange,
  parse,
  placeholder,
  keyboardType = "number-pad",
  error,
}: NumberFieldProps) {
  const [text, setText] = useState(value === null ? "" : String(value));

  function handleChangeText(newText: string) {
    setText(newText);
    onChange(parse(newText));
  }

  return (
    <TextField
      label={label}
      value={text}
      onChangeText={handleChangeText}
      error={error}
      placeholder={placeholder}
      keyboardType={keyboardType}
    />
  );
}
