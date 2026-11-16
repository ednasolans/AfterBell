import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import LoadingButton from "@/components/LoadingButton";
import { TextField } from "@/components/TextField";
import { colors } from "@/theme/colors";

import {
  useFamilyCity,
  useSaveFamilyLocation,
} from "../hooks/useFamilyLocation";
import { useFamilyLocationForm } from "../hooks/useFamilyLocationForm";
import { toLocationErrorMessage } from "../locationErrors";

// Where the family lives, to show activities near them. It handles its own
// loading and error states, so a failure never blocks the family profiles.
export function FamilyLocationCard() {
  const city = useFamilyCity();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons
          name="location-outline"
          size={20}
          color={colors.primaryDark}
        />
        <Text style={styles.title} accessibilityRole="header">
          Your location
        </Text>
      </View>

      {isEditing && !city.isPending ? (
        <FamilyLocationEditor
          initialCity={city.data ?? null}
          onDone={() => setIsEditing(false)}
        />
      ) : (
        <CitySummary query={city} onEdit={() => setIsEditing(true)} />
      )}
    </View>
  );
}

type CitySummaryProps = {
  query: ReturnType<typeof useFamilyCity>;
  onEdit: () => void;
};

function CitySummary({ query, onEdit }: Readonly<CitySummaryProps>) {
  if (query.isPending) {
    return <ActivityIndicator color={colors.primaryDark} />;
  }
  if (query.isError) {
    return (
      <View style={styles.row}>
        <Text style={styles.error}>Your town could not be loaded.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => query.refetch()}
          hitSlop={8}
        >
          <Text style={styles.link}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const city = query.data;
  return (
    <>
      <Text style={city ? styles.city : styles.text}>
        {city ?? "Add your town to see activities near you."}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={city ? "Change your town" : "Add your town"}
        onPress={onEdit}
        hitSlop={8}
      >
        <Text style={styles.link}>{city ? "Change" : "Add your town"}</Text>
      </Pressable>
    </>
  );
}

type FamilyLocationEditorProps = {
  initialCity: string | null;
  onDone: () => void;
};

function FamilyLocationEditor({
  initialCity,
  onDone,
}: Readonly<FamilyLocationEditorProps>) {
  const save = useSaveFamilyLocation();
  const form = useFamilyLocationForm({
    initialCity,
    onSave: save.mutateAsync,
  });
  const isBusy = form.isLocating || form.isFinding || save.isPending;
  const error = form.locationError ?? toLocationErrorMessage(save.error);

  async function handleSave() {
    if (await form.submit()) {
      onDone();
    }
  }

  return (
    <View style={styles.editor}>
      <TextField
        label="City or town"
        value={form.city}
        onChangeText={form.setCity}
        error={form.cityError ?? undefined}
        autoCapitalize="words"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isBusy, busy: form.isLocating }}
        disabled={isBusy}
        onPress={() => void form.locate()}
        style={styles.locate}
      >
        {form.isLocating ? (
          <ActivityIndicator color={colors.primaryDark} />
        ) : (
          <Ionicons
            name="navigate-outline"
            size={16}
            color={colors.primaryDark}
          />
        )}
        <Text style={styles.link}>Use my current location</Text>
      </Pressable>
      <Text style={styles.hint}>
        We only keep your town and an area of about 1-2 km, never your exact
        address.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          disabled={isBusy}
          style={styles.cancel}
        >
          <Text style={styles.link}>Cancel</Text>
        </Pressable>
        <LoadingButton
          label="Save"
          onPress={() => void handleSave()}
          loading={form.isFinding || save.isPending}
          disabled={form.isLocating}
          style={styles.save}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 8,
    marginBottom: 16,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: colors.text, fontSize: 17, fontWeight: "800" },
  city: { color: colors.text, fontSize: 16, fontWeight: "700" },
  text: { color: colors.textMuted },
  link: { color: colors.primaryDark, fontWeight: "700" },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  error: { color: colors.danger },
  editor: { gap: 8 },
  locate: { flexDirection: "row", alignItems: "center", gap: 6 },
  hint: { color: colors.textMuted, fontSize: 12 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 16,
  },
  cancel: { paddingVertical: 8 },
  save: { minWidth: 120 },
});
