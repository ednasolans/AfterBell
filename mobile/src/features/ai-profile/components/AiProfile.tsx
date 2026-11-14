import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { ErrorView } from "@/components/ErrorView";
import LoadingButton from "@/components/LoadingButton";
import { LoadingView } from "@/components/LoadingView";

import { useApproveProfile } from "../hooks/useApproveProfile";
import { useDiscardProfileChanges } from "../hooks/useDiscardProfileChanges";
import { useGenerateProfile } from "../hooks/useGenerateProfile";
import { useHasTechnicalSheet } from "../hooks/useHasTechnicalSheet";
import { useMyProfile } from "../hooks/useMyProfile";
import { useProfileIsOutdated } from "../hooks/useProfileIsOutdated";
import { useSaveProfile } from "../hooks/useSaveProfile";
import { OutdatedWarning } from "./OutdatedWarning";
import { ProfileDraftEditor } from "./ProfileDraftEditor";
import { type ProfileForm, type ProviderProfile } from "../types";
import { PublishedProfile } from "./PublishedProfile";
import { colors } from "@/theme/colors";

type GenerateSectionProps = {
  hasSheet: boolean;
  label: string;
  isFirst: boolean;
  onPress: () => void;
  generate: ReturnType<typeof useGenerateProfile>;
};

// Button to generate (or generate again) the profile with AI
function GenerateSection({
  hasSheet,
  label,
  isFirst,
  onPress,
  generate,
}: GenerateSectionProps) {
  if (!hasSheet) {
    return (
      <View style={styles.infoCard}>
        <Ionicons
          name="document-text-outline"
          size={22}
          color={colors.primaryDark}
        />
        <Text style={styles.hint}>
          Save your technical sheet first. The AI writes your profile from it.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.generate}>
      {generate.isError ? (
        <Text style={styles.error} accessibilityRole="alert">
          {generate.error.message}
        </Text>
      ) : null}
      <LoadingButton
        label={label}
        onPress={onPress}
        loading={generate.isPending}
        variant={isFirst ? "primary" : "outline"}
      />
    </View>
  );
}

// Text of the generate button for the current profile
function generateLabel(profile: ProviderProfile | null): string {
  if (profile === null) {
    return "Generate profile with AI";
  }
  return profile.status === "draft" ? "Generate again" : "Regenerate profile";
}

// A draft is only seen by the provider: it is generated again directly.
// Once a profile has been approved, a new text replaces the published one only
// after approval: explain it before calling the AI.
function regenerateAction(
  profile: ProviderProfile | null,
  generate: () => void,
): () => void {
  if (profile === null || profile.status === "draft") {
    return generate;
  }
  return () =>
    Alert.alert(
      "Regenerate your profile?",
      "The AI will write a new text from your technical sheet. Families will keep seeing your current profile until you approve the new one.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Regenerate", onPress: generate },
      ],
    );
}

type ProfileReviewProps = {
  profile: ProviderProfile;
  save: ReturnType<typeof useSaveProfile>;
  approve: ReturnType<typeof useApproveProfile>;
  discard: ReturnType<typeof useDiscardProfileChanges>;
  // Closes the editor of the published profile
  onClose: () => void;
};

// Editor of a draft, of a pending version or of the published profile
function ProfileReview({
  profile,
  save,
  approve,
  discard,
  onClose,
}: ProfileReviewProps) {
  // Going back to the published text: close the editor of the published
  // profile, or drop the pending version saved in the database
  function discardChanges() {
    if (profile.status === "approved") {
      onClose();
    } else {
      discard.mutate();
    }
  }

  // After saving, an edited published profile is pending approval: the
  // editor stays open as the pending version
  async function saveChanges(form: ProfileForm) {
    await save.mutateAsync(form);
    onClose();
  }

  return (
    <ProfileDraftEditor
      profile={profile}
      onSave={saveChanges}
      isSaving={save.isPending}
      saveFailed={save.isError}
      onApprove={() => approve.mutate()}
      isApproving={approve.isPending}
      approveFailed={approve.isError}
      // Discarding needs an approved version to go back to
      onDiscard={profile.approvedHeadline === null ? undefined : discardChanges}
      isDiscarding={discard.isPending}
      discardFailed={discard.isError}
    />
  );
}

export function AiProfile() {
  const profile = useMyProfile();
  const sheet = useHasTechnicalSheet();
  const generate = useGenerateProfile();
  const save = useSaveProfile();
  const approve = useApproveProfile();
  const outdated = useProfileIsOutdated();
  const discard = useDiscardProfileChanges();
  // The provider opened the editor of the published profile
  const [isEditingPublished, setIsEditingPublished] = useState(false);

  if (profile.isPending || sheet.isPending) {
    return <LoadingView />;
  }

  if (profile.isError || sheet.isError) {
    return (
      <ErrorView
        message="Your profile could not be loaded."
        onRetry={() => {
          void profile.refetch();
          void sheet.refetch();
        }}
      />
    );
  }

  const current = profile.data;
  const regenerate = regenerateAction(current, () => generate.mutate());

  const generateSection = (
    <GenerateSection
      hasSheet={sheet.data}
      label={generateLabel(current)}
      isFirst={current === null}
      onPress={regenerate}
      generate={generate}
    />
  );
  // While it loads or if it fails, the warning is simply not shown
  const outdatedWarning =
    current !== null && outdated.data === true ? (
      <OutdatedWarning onRegenerate={regenerate} />
    ) : null;

  if (current?.status === "approved" && !isEditingPublished) {
    return (
      <View style={styles.container}>
        {approve.isSuccess ? (
          <Text style={styles.success} accessibilityRole="alert">
            Your profile is published.
          </Text>
        ) : null}
        {outdatedWarning}
        <PublishedProfile
          profile={current}
          onEdit={() => setIsEditingPublished(true)}
        />
        {generateSection}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>AI PROFILE</Text>
      <Text style={styles.title} accessibilityRole="header">
        Your public profile
      </Text>
      <Text style={styles.subtitle}>
        Let AI help you tell families what makes your organisation special.
      </Text>
      {outdatedWarning}

      {current ? (
        <ProfileReview
          // A new draft (generated again) starts a fresh form
          key={current.generatedAt}
          profile={current}
          save={save}
          approve={approve}
          discard={discard}
          onClose={() => setIsEditingPublished(false)}
        />
      ) : (
        <View style={styles.infoCard}>
          <Ionicons
            name="sparkles-outline"
            size={24}
            color={colors.primaryDark}
          />
          <Text style={styles.hint}>
            The AI writes a short presentation of your organisation from your
            technical sheet. You will review it before families can see it.
          </Text>
        </View>
      )}
      {generateSection}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { color: colors.textMuted, lineHeight: 21, marginBottom: 10 },
  hint: { flex: 1, color: colors.textMuted, lineHeight: 20 },
  infoCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    marginBottom: 12,
  },
  generate: { marginTop: 8 },
  error: { color: colors.danger, textAlign: "center", marginBottom: 8 },
  success: { color: colors.primaryDark, fontWeight: "700" },
});
