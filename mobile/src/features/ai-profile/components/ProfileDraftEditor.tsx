import { Alert, StyleSheet, Text, View } from "react-native";

import { FormSubmit } from "@/components/FormSubmit";
import LoadingButton from "@/components/LoadingButton";
import { TextField } from "@/components/TextField";
import { hasErrors } from "@/lib/validation";

import { useProfileForm } from "../hooks/useProfileForm";
import { type ProfileForm, type ProviderProfile } from "../types";
import { ProfileStatusBadge } from "./ProfileStatusBadge";

type ProfileDraftEditorProps = {
  profile: ProviderProfile;
  onSave: (form: ProfileForm) => Promise<void>;
  isSaving: boolean;
  saveFailed: boolean;
  onApprove: () => void;
  isApproving: boolean;
  approveFailed: boolean;
};

export function ProfileDraftEditor({
  profile,
  onSave,
  isSaving,
  saveFailed,
  onApprove,
  isApproving,
  approveFailed,
}: ProfileDraftEditorProps) {
  const { form, errors, updateField, submit } = useProfileForm({
    initialForm: {
      headline: profile.headline,
      description: profile.description,
    },
    onSubmit: onSave,
  });

  // Publishing cannot be undone in Sprint 1: ask first, and save the edits before
  function confirmApprove() {
    Alert.alert(
      "Publish your profile?",
      "Families will be able to see it. You will not be able to edit it for now.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Publish",
          style: "destructive",
          onPress: async () => {
            if (await submit()) {
              onApprove();
            }
          },
        },
      ],
    );
  }

  return (
    <View>
      <ProfileStatusBadge status="draft" />
      <Text style={styles.hint}>
        Review the text written by the AI. You can change it before publishing.
      </Text>

      <TextField
        label="Headline"
        value={form.headline}
        onChangeText={(text) => updateField("headline", text)}
        error={errors.headline}
      />
      <TextField
        label="Description"
        value={form.description}
        onChangeText={(text) => updateField("description", text)}
        error={errors.description}
        multiline
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { color: "#555", marginBottom: 16 },
  error: { color: "#c00", textAlign: "center", marginBottom: 8 },
});
