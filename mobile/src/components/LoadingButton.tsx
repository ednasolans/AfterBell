import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { colors } from "@/theme/colors";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "outline";
  style?: StyleProp<ViewStyle>;
};

export default function LoadingButton({
  label,
  onPress,
  loading = false,
  variant = "primary",
  style,
}: Readonly<Props>) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.outline,
        loading && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? colors.white : colors.primaryDark}
        />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary ? styles.textPrimary : styles.textOutline,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { padding: 15, borderRadius: 14, alignItems: "center" },
  primary: { backgroundColor: colors.primary },
  outline: { borderWidth: 1, borderColor: colors.primary },
  disabled: { opacity: 0.6 },
  text: { fontWeight: "600", fontSize: 16 },
  textPrimary: { color: colors.white },
  textOutline: { color: colors.primaryDark },
});
