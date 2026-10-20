import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

type FormSubmitProps = {
  label: string;
  onPress: () => void;
  isSaving: boolean;
  // The form has validation errors (shown under each field)
  hasFieldErrors: boolean;
  // Message shown when saving failed, or null
  saveError: string | null;
};

// Footer shared by every form: summary of errors and the save button
export function FormSubmit({
  label,
  onPress,
  isSaving,
  hasFieldErrors,
  saveError,
}: FormSubmitProps) {
  return (
    <>
      {hasFieldErrors ? (
        <Text style={styles.formError}>
          Please fix the errors above before saving.
        </Text>
      ) : null}

      {saveError ? <Text style={styles.formError}>{saveError}</Text> : null}

      <Pressable
        onPress={onPress}
        disabled={isSaving}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isSaving, busy: isSaving }}
        style={[styles.button, isSaving && styles.buttonDisabled]}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{label}</Text>
        )}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  formError: {
    color: "#c00",
    marginTop: 8,
    textAlign: "center",
  },
  button: {
    marginTop: 16,
    marginBottom: 32,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#2563eb",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
