import { Pressable, StyleSheet, Text, View } from "react-native";

import { TextField } from "@/components/TextField";
import {
  EMPTY_ADDRESS_FORM,
  type AddressErrors,
  type AddressForm,
} from "@/lib/addresses";

type AddressesEditorProps = {
  addresses: AddressForm[];
  onChange: (addresses: AddressForm[]) => void;
  // One set of errors per address, in the same order
  errors?: AddressErrors[];
};

// List of the places where a provider offers its activities.
// The first address is the main one and cannot be removed, so there is always one.
export function AddressesEditor({
  addresses,
  onChange,
  errors = [],
}: AddressesEditorProps) {
  function updateAddress(index: number, changes: Partial<AddressForm>) {
    onChange(
      addresses.map((address, i) =>
        i === index ? { ...address, ...changes } : address,
      ),
    );
  }

  function removeAddress(index: number) {
    onChange(addresses.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Add every place where you offer activities. The first one is your main
        address.
      </Text>

      {addresses.map((address, index) => {
        const number = index + 1;
        const isMain = index === 0;
        return (
          // The inputs are controlled (their text comes from `addresses`), so
          // using the position as key is safe when an address is removed
          <View key={`address-${number}`} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {isMain ? "Main address" : `Address ${number}`}
              </Text>
              {isMain ? null : (
                <Pressable
                  onPress={() => removeAddress(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove address ${number}`}
                  hitSlop={8}
                >
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              )}
            </View>

            <TextField
              label={`Street and number ${number}`}
              placeholder="C/ Major 1"
              value={address.address}
              onChangeText={(text) => updateAddress(index, { address: text })}
              error={errors[index]?.address}
            />
            <TextField
              label={`City ${number}`}
              placeholder="Lleida"
              value={address.city}
              onChangeText={(text) => updateAddress(index, { city: text })}
              error={errors[index]?.city}
            />
          </View>
        );
      })}

      <Pressable
        onPress={() => onChange([...addresses, EMPTY_ADDRESS_FORM])}
        accessibilityRole="button"
        style={styles.addButton}
      >
        <Text style={styles.addButtonText}>Add another address</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  hint: { color: "#555", marginBottom: 12 },
  card: {
    padding: 12,
    paddingBottom: 0,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  removeText: { fontSize: 16, color: "#c00" },
  addButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2563eb",
  },
  addButtonText: { color: "#2563eb", fontWeight: "600" },
});
