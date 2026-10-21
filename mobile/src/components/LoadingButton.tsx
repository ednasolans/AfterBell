import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'outline';
  style?: StyleProp<ViewStyle>;
};

export default function LoadingButton({
  label,
  onPress,
  loading = false,
  variant = 'primary',
  style,
}: Readonly<Props>) {
  const isPrimary = variant === 'primary';

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
        <ActivityIndicator color={isPrimary ? '#fff' : '#111'} />
      ) : (
        <Text style={[styles.text, isPrimary ? styles.textPrimary : styles.textOutline]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { padding: 14, borderRadius: 8, alignItems: 'center' },
  primary: { backgroundColor: '#111' },
  outline: { borderWidth: 1, borderColor: '#111' },
  disabled: { opacity: 0.6 },
  text: { fontWeight: '600', fontSize: 16 },
  textPrimary: { color: '#fff' },
  textOutline: { color: '#111' },
});