import { View } from "react-native";

import { FormSubmit } from "@/components/FormSubmit";
import { MultiSelect } from "@/components/MultiSelect";
import { TextField } from "@/components/TextField";
import { hasErrors } from "@/lib/validation";

import { toEnrolmentErrorMessage } from "../enrolmentErrors";
import { useEnrolmentRequestForm } from "../hooks/useEnrolmentRequestForm";
import {
  type EnrolmentProfile,
  type EnrolmentRequestForm as Form,
} from "../types";

type EnrolmentRequestFormProps = {
  // Only the profiles that can still ask for this activity
  profiles: EnrolmentProfile[];
  onSubmit: (form: Form) => Promise<unknown>;
  isSending: boolean;
  sendError: Error | null;
  onSent: () => void;
};

export function EnrolmentRequestForm({
  profiles,
  onSubmit,
  isSending,
  sendError,
  onSent,
}: Readonly<EnrolmentRequestFormProps>) {
  const { form, updateField, errors, submit } = useEnrolmentRequestForm({
    onSubmit,
  });

  async function handleSend() {
    if (await submit()) {
      onSent();
    }
  }

  return (
    <View>
      <MultiSelect
        label="Who would attend"
        placeholder="Choose family profiles"
        options={profiles.map((profile) => ({
          value: profile.id,
          label: profile.firstName,
        }))}
        values={form.profileIds}
        onChange={(profileIds) => updateField("profileIds", profileIds)}
        error={errors.profileIds}
      />
      <TextField
        label="Message (optional)"
        value={form.message}
        onChangeText={(message) => updateField("message", message)}
        error={errors.message}
        multiline
      />
      <FormSubmit
        label="Send request"
        onPress={handleSend}
        isSaving={isSending}
        hasFieldErrors={hasErrors(errors)}
        saveError={toEnrolmentErrorMessage(
          sendError,
          "The request could not be sent. Please try again.",
        )}
      />
    </View>
  );
}
