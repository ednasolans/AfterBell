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
      <Text style={styles.hint}>
        Save your technical sheet first. The AI writes your profile from it.
      </Text>
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
    <View>
      <Text style={styles.title} accessibilityRole="header">
        Your public profile
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
        <Text style={styles.hint}>
          The AI writes a short presentation of your organisation from your
          technical sheet. You will review it before families can see it.
        </Text>
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
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  hint: { color: "#555", marginBottom: 16 },
  generate: { marginTop: 8 },
  error: { color: "#c00", textAlign: "center", marginBottom: 8 },
});
