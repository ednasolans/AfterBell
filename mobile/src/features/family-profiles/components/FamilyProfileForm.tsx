
import { useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AGE_RANGES } from "@/lib/ages";
import { ACTIVITY_CATEGORIES } from "@/lib/activityCategories";

import {
  EMPTY_FAMILY_PROFILE_FORM,
  type ActivityCategory,
  type FamilyProfileFormValues,
} from "../types";

import {
  hasFamilyProfileErrors,
  validateFamilyProfile,
} from "../validation";

type Props = Readonly<{
  initialValues?: FamilyProfileFormValues;
  onSave: (values: FamilyProfileFormValues) => Promise<void>;
  isSaving: boolean;
  saveError?: string;
}>;

export function FamilyProfileForm({
  initialValues = EMPTY_FAMILY_PROFILE_FORM,
  onSave,
  isSaving,
  saveError,
}: Props) {
  const [values, setValues] =
    useState<FamilyProfileFormValues>(initialValues);

  const [submitted, setSubmitted] = useState(false);

  const errors = submitted
    ? validateFamilyProfile(values)
    : {};

  function toggleInterest(interest: ActivityCategory) {
    setValues((previous) => {
      const selected = previous.interests.includes(interest);

      return {
        ...previous,
        interests: selected
          ? previous.interests.filter(
              (item) => item !== interest,
            )
          : [...previous.interests, interest],
      };
    });
  }

  async function handleSave() {
    if (isSaving) return;

    setSubmitted(true);

    const validationErrors = validateFamilyProfile(values);

    if (hasFamilyProfileErrors(validationErrors)) {
      return;
    }

    await onSave(values);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Family profile</Text>

      <Text style={styles.label}>First name</Text>

      <TextInput
        accessibilityLabel="First name"
        placeholder="Enter first name"
        style={styles.input}
        value={values.firstName}
        onChangeText={(firstName) =>
          setValues((previous) => ({
            ...previous,
            firstName,
          }))
        }
      />

      {errors.firstName ? (
        <Text style={styles.error}>{errors.firstName}</Text>
      ) : null}

      <Text style={styles.label}>Age range</Text>

      <View style={styles.options}>
        {AGE_RANGES.map((age) => (
          <Pressable
            key={age}
            accessibilityRole="radio"
            accessibilityState={{
              checked: values.ageRange === age,
            }}
            onPress={() =>
              setValues((previous) => ({
                ...previous,
                ageRange: age,
              }))
            }
            style={[
              styles.option,
              values.ageRange === age && styles.selected,
            ]}
          >
            <Text>{age}</Text>
          </Pressable>
        ))}
      </View>

      {errors.ageRange ? (
        <Text style={styles.error}>{errors.ageRange}</Text>
      ) : null}

      <Text style={styles.label}>
        Interests (optional)
      </Text>

      <View style={styles.options}>
        {ACTIVITY_CATEGORIES.map((interest) => {
          const selected = values.interests.includes(interest);

          return (
            <Pressable
              key={interest}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => toggleInterest(interest)}
              style={[
                styles.option,
                selected && styles.selected,
              ]}
            >
              <Text>{interest}</Text>
            </Pressable>
          );
        })}
      </View>

      {errors.interests ? (
        <Text style={styles.error}>{errors.interests}</Text>
      ) : null}

      {saveError ? (
        <Text style={styles.error}>{saveError}</Text>
      ) : null}

      <Pressable
        accessibilityLabel="Save profile"
        accessibilityRole="button"
        disabled={isSaving}
        onPress={() => void handleSave()}
        style={styles.button}
      >
        {isSaving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>
            Save profile
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cccccc",
    borderRadius: 8,
    padding: 12,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#cccccc",
    borderRadius: 8,
  },
  selected: {
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  error: {
    color: "#b91c1c",
  },
  button: {
    marginTop: 16,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
  },
});
