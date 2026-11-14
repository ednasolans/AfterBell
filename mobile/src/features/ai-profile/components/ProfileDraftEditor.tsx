import { Alert, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePreventRemove } from "expo-router";

import { FormSubmit } from "@/components/FormSubmit";
import LoadingButton from "@/components/LoadingButton";
import { TextField } from "@/components/TextField";
import { hasErrors } from "@/lib/validation";

import { useProfileForm } from "../hooks/useProfileForm";
import {
  type ProfileForm,
  type ProfileStatus,
  type ProviderProfile,
} from "../types";
import { DESCRIPTION_MAX_LENGTH, HEADLINE_MAX_LENGTH } from "../validation";
import { ProfileStatusBadge } from "./ProfileStatusBadge";
import { colors } from "@/theme/colors";

type ProfileDraftEditorProps = {
  profile: ProviderProfile;
  onSave: (form: ProfileForm) => Promise<void>;
  isSaving: boolean;
  saveFailed: boolean;
  onApprove: () => void;
  isApproving: boolean;
  approveFailed: boolean;
  // Leaves the editor and shows the published version again. Absent while
  // there is no published version to go back to.
  onDiscard?: () => void;
  isDiscarding?: boolean;
  discardFailed?: boolean;
};

// What the provider is reviewing, depending on the status of the profile
const HINTS: Record<ProfileStatus, string> = {
  draft:
    "Review the text written by the AI. You can change it before publishing.",
  pending_approval:
    "Families still see your published profile. Approve this version to replace it.",
  approved:
    "Families see this text now. After saving, your changes need a new approval.",
};

// "23 / 120": characters used, as the database counts them (trimmed)
function CharacterCount({ value, max }: { value: string; max: number }) {
  const length = value.trim().length;
  return (
    <Text style={[styles.count, length > max && styles.countOver]}>
      {`${length} / ${max}`}
    </Text>
  );
}

export function ProfileDraftEditor({
  profile,
  onSave,
  isSaving,
  saveFailed,
  onApprove,
  isApproving,
  approveFailed,
  onDiscard,
  isDiscarding = false,
  discardFailed = false,
}: ProfileDraftEditorProps) {
  const { form, errors, isDirty, updateField, submit } = useProfileForm({
    initialForm: {
      headline: profile.headline,
      description: profile.description,
    },
    onSubmit: onSave,
  });
  const isEditingPublished = profile.status === "approved";

  // Leaving the screen with unsaved text asks first
  usePreventRemove(isDirty, ({ repeat }) => {
    Alert.alert(
      "Discard your changes?",
      "Your changes to the profile have not been saved.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: repeat },
      ],
    );
  });

  // Ask first, and save the edits before publishing
  function confirmApprove() {
    Alert.alert(
      "Publish your profile?",
      profile.approvedHeadline === null
        ? "Families will be able to see it."
        : "Families will see this version instead of the current one.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Publish",
          onPress: async () => {
            if (await submit()) {
              onApprove();
            }
          },
        },
      ],
    );
  }

  // Closing the editor of the published profile only asks when something
  // changed; dropping a pending version always asks, because it is saved
  function confirmDiscard() {
    if (!onDiscard) return;
    if (isEditingPublished && !isDirty) {
      onDiscard();
      return;
    }
    Alert.alert(
      "Go back to your published profile?",
      "The new text will be lost.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: onDiscard },
      ],
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.statusRow}>
        <Ionicons
          name="sparkles-outline"
          size={22}
          color={colors.primaryDark}
        />
        <ProfileStatusBadge status={profile.status} />
      </View>
      <Text style={styles.hint}>{HINTS[profile.status]}</Text>
      <TextField
        label="Headline"
        value={form.headline}
        onChangeText={(text) => updateField("headline", text)}
        error={errors.headline}
      />
      <CharacterCount value={form.headline} max={HEADLINE_MAX_LENGTH} />
      <TextField
        label="Description"
        value={form.description}
        onChangeText={(text) => updateField("description", text)}
        error={errors.description}
        multiline
      />
      <CharacterCount value={form.description} max={DESCRIPTION_MAX_LENGTH} />
      <FormSubmit
        label="Save changes"
        onPress={() => {
          void submit();
        }}
        isSaving={isSaving}
        hasFieldErrors={hasErrors(errors)}
        saveError={
          saveFailed
            ? "Your changes could not be saved. Please try again."
            : null
        }
      />
      {isEditingPublished ? null : (
        <>
          {approveFailed ? (
            <Text style={styles.error}>
              Your profile could not be published. Please try again.
            </Text>
          ) : null}
          <LoadingButton
            label="Approve and publish"
            onPress={confirmApprove}
            loading={isApproving}
            variant="outline"
          />
        </>
      )}
      {onDiscard ? (
        <>
          {discardFailed ? (
            <Text style={styles.error}>
              Your changes could not be discarded. Please try again.
            </Text>
          ) : null}
          <LoadingButton
            label={isEditingPublished ? "Cancel editing" : "Discard changes"}
            onPress={confirmDiscard}
            loading={isDiscarding}
            variant="outline"
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  hint: { color: colors.textMuted, lineHeight: 20, marginBottom: 16 },
  count: {
    alignSelf: "flex-end",
    color: colors.textMuted,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  countOver: { color: colors.danger, fontWeight: "700" },
  error: { color: colors.danger, textAlign: "center", marginBottom: 8 },
});
