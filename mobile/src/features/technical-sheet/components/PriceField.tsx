import { useState } from 'react';

import { TextField } from '../../../components/TextField';
import { parsePrice } from '../price';

type PriceFieldProps = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
};

export function PriceField({ label, value, onChange, error }: PriceFieldProps) {
  // The text can be incomplete while typing ("30,"), so it lives here; the form only gets the number
  const [text, setText] = useState(value === null ? '' : String(value));

  function handleChangeText(newText: string) {
    setText(newText);
    onChange(parsePrice(newText));
  }

  return (
    <TextField
      label={label}
      value={text}
      onChangeText={handleChangeText}
      error={error}
      placeholder="0,00"
      keyboardType="decimal-pad"
    />
  );
}