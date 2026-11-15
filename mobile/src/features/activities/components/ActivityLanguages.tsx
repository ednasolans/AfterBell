import { StyleSheet, Text, View } from "react-native";

import LoadingButton from "@/components/LoadingButton";
import { TextField } from "@/components/TextField";
import { type LanguagePair } from "@/lib/activity";
import { colors } from "@/theme/colors";

type Props = {
  pairs: LanguagePair[];
  onChange: (pairs: LanguagePair[]) => void;
  error?: string;
};

export function ActivityLanguages({ pairs, onChange, error }: Readonly<Props>) {
  function updatePair(index: number, changes: Partial<LanguagePair>) {
    onChange(
      pairs.map((pair, i) => (i === index ? { ...pair, ...changes } : pair)),
    );
  }

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.heading}>
        Languages and levels
      </Text>
      {pairs.map((pair, index) => (
        <View key={index} style={styles.pair}>
          <TextField
            label={`Language ${index + 1}`}
            value={pair.language}
            onChangeText={(language) => updatePair(index, { language })}
          />
          <TextField
            label={`Level ${index + 1}`}
            value={pair.level}
            onChangeText={(level) => updatePair(index, { level })}
          />
          <LoadingButton
            label={`Remove language ${index + 1}`}
            onPress={() => onChange(pairs.filter((_, i) => i !== index))}
            variant="outline"
          />
        </View>
      ))}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <LoadingButton
        label="Add language"
        onPress={() => onChange([...pairs, { language: "", level: "" }])}
        variant="outline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, marginBottom: 16 },
  heading: { fontWeight: "700", color: colors.text },
  pair: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  error: { color: colors.danger },
});
