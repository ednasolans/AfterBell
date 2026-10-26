import { StyleSheet } from "react-native";
import { colors } from "@/theme/colors";

// Styles shared by the authentication screens.
export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 8,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 16,
  },
  subtitle: { color: colors.textMuted, fontSize: 15, marginBottom: 8 },
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
  submit: { marginTop: 8 },
  link: { marginTop: 16, textAlign: "center", color: colors.primaryDark },
});
