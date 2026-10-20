import { NumberField } from "@/components/NumberField";
import { parsePrice } from "@/lib/price";

type PriceFieldProps = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
};

// A NumberField for prices: decimals with a comma or a dot
export function PriceField({ label, value, onChange, error }: PriceFieldProps) {
  return (
    <NumberField
      label={label}
      value={value}
      onChange={onChange}
      parse={parsePrice}
      placeholder="0,00"
      keyboardType="decimal-pad"
      error={error}
    />
  );
}
