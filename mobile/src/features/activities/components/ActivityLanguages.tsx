import { StyleSheet, Text, View } from "react-native";

import LoadingButton from "@/components/LoadingButton";
import { TextField } from "@/components/TextField";
import { type LanguagePair } from "@/lib/activity";
import { colors } from "@/theme/colors";

import { type ActivityLanguageField } from "../types";

type Props = {
  pairs: ActivityLanguageField[];
  onChange: (pairs: ActivityLanguageField[]) => void;
  onAdd: () => void;
  error?: string;
};

export function ActivityLanguages({
  pairs,
  onChange,
  onAdd,
  error,
}: Readonly<Props>) {
  function updatePair(id: number, changes: Partial<LanguagePair>) {
    onChange(
      pairs.map((pair) => (pair.id === id ? { ...pair, ...changes } : pair)),
    );
  }

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.heading}>
        Languages and levels
      </Text>
      {pairs.map((pair, index) => (
        <View key={pair.id} style={styles.pair}>
          <TextField
            label={`Language ${index + 1}`}
            value={pair.language}
            onChangeText={(language) => updatePair(pair.id, { language })}
          />
          <TextField
            label={`Level ${index + 1}`}
            value={pair.level}
            onChangeText={(level) => updatePair(pair.id, { level })}
          />
          <LoadingButton
            label={`Remove language ${index + 1}`}
            onPress={() => onChange(pairs.filter(({ id }) => id !== pair.id))}
            variant="outline"
          />
        </View>
      ))}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <LoadingButton label="Add language" onPress={onAdd} variant="outline" />
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
