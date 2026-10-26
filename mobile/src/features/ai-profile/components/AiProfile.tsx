import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { ErrorView } from "@/components/ErrorView";
import LoadingButton from "@/components/LoadingButton";
import { LoadingView } from "@/components/LoadingView";

import { useApproveProfile } from "../hooks/useApproveProfile";
import { useGenerateProfile } from "../hooks/useGenerateProfile";
import { useHasTechnicalSheet } from "../hooks/useHasTechnicalSheet";
import { useMyProfile } from "../hooks/useMyProfile";
import { useSaveProfile } from "../hooks/useSaveProfile";
import { ProfileDraftEditor } from "./ProfileDraftEditor";
import { PublishedProfile } from "./PublishedProfile";
import { colors } from "@/theme/colors";

type GenerateSectionProps = {
  hasSheet: boolean;
  hasDraft: boolean;
  generate: ReturnType<typeof useGenerateProfile>;
};

// Button to generate (or generate again) the draft with AI
function GenerateSection({
  hasSheet,
  hasDraft,
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
        label={hasDraft ? "Generate again" : "Generate profile with AI"}
        onPress={() => generate.mutate()}
        loading={generate.isPending}
        variant={hasDraft ? "outline" : "primary"}
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

  if (profile.data?.status === "approved") {
    return <PublishedProfile profile={profile.data} />;
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
      {profile.data ? (
        <ProfileDraftEditor
          // A new draft (generated again) starts a fresh form
          key={profile.data.generatedAt}
          profile={profile.data}
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
      <GenerateSection
        hasSheet={sheet.data}
        hasDraft={profile.data !== null}
        generate={generate}
      />
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
