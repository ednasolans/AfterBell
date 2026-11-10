import { Ionicons } from "@expo/vector-icons";
import { Alert, StyleSheet, Text, View } from "react-native";

import { ErrorView } from "@/components/ErrorView";
import LoadingButton from "@/components/LoadingButton";
import { LoadingView } from "@/components/LoadingView";

import { useApproveProfile } from "../hooks/useApproveProfile";
import { useGenerateProfile } from "../hooks/useGenerateProfile";
import { useHasTechnicalSheet } from "../hooks/useHasTechnicalSheet";
import { useMyProfile } from "../hooks/useMyProfile";
import { useProfileIsOutdated } from "../hooks/useProfileIsOutdated";
import { useSaveProfile } from "../hooks/useSaveProfile";
import { OutdatedWarning } from "./OutdatedWarning";
import { ProfileDraftEditor } from "./ProfileDraftEditor";
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

export function AiProfile() {
  const profile = useMyProfile();
  const sheet = useHasTechnicalSheet();
  const generate = useGenerateProfile();
  const save = useSaveProfile();
  const approve = useApproveProfile();
  const outdated = useProfileIsOutdated();

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
  // While it loads or if it fails, the warning is simply not shown
  const isOutdated = current !== null && outdated.data === true;

  // Once a profile has been approved, a new text replaces the published one
  // only after approval: explain it before calling the AI
  function confirmRegenerate() {
    Alert.alert(
      "Regenerate your profile?",
      "The AI will write a new text from your technical sheet. Families will keep seeing your current profile until you approve the new one.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Regenerate", onPress: () => generate.mutate() },
      ],
    );
  }

  // A draft is only seen by the provider: it is generated again directly
  const isDraftOrEmpty = current === null || current.status === "draft";
  const regenerate = isDraftOrEmpty
    ? () => generate.mutate()
    : confirmRegenerate;
  const generateLabel = isDraftOrEmpty
    ? "Generate again"
    : "Regenerate profile";

  const generateSection = (
    <GenerateSection
      hasSheet={sheet.data}
      label={current === null ? "Generate profile with AI" : generateLabel}
      isFirst={current === null}
      onPress={regenerate}
      generate={generate}
    />
  );
  const outdatedWarning = isOutdated ? (
    <OutdatedWarning onRegenerate={regenerate} />
  ) : null;

  if (current?.status === "approved") {
    return (
      <View style={styles.container}>
        {outdatedWarning}
        <PublishedProfile profile={current} />
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
        <ProfileDraftEditor
          // A new draft (generated again) starts a fresh form
          key={current.generatedAt}
          profile={current}
          onSave={save.mutateAsync}
          isSaving={save.isPending}
          saveFailed={save.isError}
          onApprove={() => approve.mutate()}
          isApproving={approve.isPending}
          approveFailed={approve.isError}
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
});
