import { Pressable, StyleSheet, Text, View } from "react-native";

import { Select, type SelectOption } from "@/components/Select";
import { formatAddress } from "@/lib/addresses";

import { useMyAddresses } from "../hooks/useMyAddresses";

const LABEL = "Place";

type AddressSelectProps = {
  value: string | null;
  onChange: (addressId: string) => void;
  error?: string;
};

// Chooses one of the addresses of the provider. Handles its own loading,
// error and empty states so that the rest of the form can still be filled in.
export function AddressSelect({ value, onChange, error }: AddressSelectProps) {
  const addresses = useMyAddresses();

  if (addresses.isPending) {
    return <Message text="Loading your addresses…" />;
  }

  if (addresses.isError) {
    return (
      <Message text="Your addresses could not be loaded." error={error}>
        <Pressable
          onPress={() => addresses.refetch()}
          accessibilityRole="button"
        >
          <Text style={styles.link}>Try again</Text>
        </Pressable>
      </Message>
    );
  }

  if (addresses.data.length === 0) {
    return (
      <Message
        text="Add your addresses in your technical sheet before creating an activity."
        error={error}
      />
    );
  }

  const options: SelectOption<string>[] = addresses.data.map((address) => ({
    value: address.id,
    label: formatAddress(address),
  }));

  return (
    <Select
      label={LABEL}
      placeholder="Choose where it takes place"
      options={options}
      value={value}
      onChange={onChange}
      error={error}
    />
  );
}

type MessageProps = {
  text: string;
  error?: string;
  children?: React.ReactNode;
};

// Same label as the Select, with a message instead of the options
function Message({ text, error, children }: MessageProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{LABEL}</Text>
      <Text style={styles.message}>{text}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  message: { color: "#555" },
  link: { color: "#2563eb", fontWeight: "600", marginTop: 4 },
  error: { color: "red", fontSize: 12, marginTop: 4 },
});
