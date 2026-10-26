import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";

// Adjust the path to wherever your Supabase client lives.
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";

// These values must match what the trigger from Issue 2 expects
// in raw_user_meta_data->>'account_type' (and the DB enum/check constraint).
type AccountType = "customer" | "company";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "customer", label: "Customer" },
  { value: "company", label: "Company" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function validate(
  email: string,
  password: string,
  confirmPassword: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export default function SignUpScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("customer");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setSubmitError(null);

    const errors = validate(email, password, confirmPassword);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          // Read by the Issue 2 trigger to create the `accounts` row.
          data: { account_type: accountType },
        },
      });

      if (error) {
        // e.g. "User already registered"
        setSubmitError(error.message);
        return;
      }

      if (data.session) {
        // Email confirmation disabled: the user is already signed in.
        router.replace("/");
      } else {
        // Email confirmation enabled: no session until the user confirms.
        router.replace("/(auth)/login");
      }
    } catch (e) {
      setSubmitError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Create account</Text>

      <View style={styles.selector} accessibilityRole="radiogroup">
        {ACCOUNT_TYPES.map(({ value, label }) => {
          const selected = accountType === value;
          return (
            <Pressable
              key={value}
              onPress={() => setAccountType(value)}
              style={[styles.option, selected && styles.optionSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.optionText,
                  selected && styles.optionTextSelected,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={[styles.input, fieldErrors.email && styles.inputError]}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      {fieldErrors.email && (
        <Text style={styles.error}>{fieldErrors.email}</Text>
      )}

      <TextInput
        style={[styles.input, fieldErrors.password && styles.inputError]}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
      />
      {fieldErrors.password && (
        <Text style={styles.error}>{fieldErrors.password}</Text>
      )}

      <TextInput
        style={[styles.input, fieldErrors.confirmPassword && styles.inputError]}
        placeholder="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
      />
      {fieldErrors.confirmPassword && (
        <Text style={styles.error}>{fieldErrors.confirmPassword}</Text>
      )}

      {submitError && <Text style={styles.error}>{submitError}</Text>}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={loading}
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign up</Text>
        )}
      </Pressable>

      <Link href="/(auth)/login" style={styles.link}>
        Already have an account? Sign in
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 8 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  selector: { flexDirection: "row", gap: 8, marginBottom: 8 },
  option: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: { fontWeight: "600", color: colors.text },
  optionTextSelected: { color: colors.white },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 13 },
  button: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontWeight: "600", fontSize: 16 },
  link: { marginTop: 16, textAlign: "center", color: colors.primaryDark },
});
