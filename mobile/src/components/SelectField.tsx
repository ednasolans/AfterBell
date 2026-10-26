import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

interface SelectFieldProps {
  label: string;
  // Text shown inside the field; when it is empty, the placeholder is shown instead
  text: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
}

// The closed part of a select: label, field with the current choice and arrow, and error message
export function SelectField({
  label,
  text,
  placeholder,
  onPress,
  error,
}: SelectFieldProps) {
  const hasValue = text !== "";

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={[styles.field, error ? styles.fieldError : null]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${hasValue ? text : placeholder}`}
      >
        <Text
          style={[styles.text, hasValue ? null : styles.placeholder]}
          numberOfLines={1}
        >
          {hasValue ? text : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  field: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  fieldError: { borderColor: colors.danger },
  text: { flex: 1, fontSize: 16, color: colors.text },
  placeholder: { color: colors.textMuted },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
});
