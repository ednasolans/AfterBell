
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import {
  ActivityIndicator,
  Text,
  View,
} from "react-native";

import { FamilyProfileForm } from
  "@/features/family-profiles/components/FamilyProfileForm";

import {
  useCreateFamilyProfile,
  useFamilyProfile,
  useUpdateFamilyProfile,
} from "@/features/family-profiles/hooks/useFamilyProfiles";

import { useFamilyUser } from
  "@/features/family-profiles/hooks/useFamilyUser";

import { AGE_RANGES } from "@/lib/ages";
import { ACTIVITY_CATEGORIES } from
  "@/lib/activityCategories";

import type { FamilyProfileFormValues } from
  "@/features/family-profiles/types";

export default function FamilyProfileFormScreen() {
  const router = useRouter();

  const { id } = useLocalSearchParams<{
    id?: string;
  }>();

  const { userId, loading } = useFamilyUser();

  const profileQuery = useFamilyProfile(userId, id);
  const createMutation = useCreateFamilyProfile();
  const updateMutation = useUpdateFamilyProfile();

  const isEditing = Boolean(id);

  const isSaving =
    createMutation.isPending || updateMutation.isPending;

  async function handleSave(
    values: FamilyProfileFormValues,
  ) {
    try {
      if (id) {
        await updateMutation.mutateAsync({
          id,
          values,
        });
      } else {
        await createMutation.mutateAsync(values);
      }

      router.replace("/family-profiles");
    } catch {
      // The mutation keeps the error for display.
    }
  }

  if (loading || (isEditing && profileQuery.isPending)) {
    return <ActivityIndicator />;
  }

  if (!userId) {
    return <Text>You must be logged in.</Text>;
  }

  if (isEditing && profileQuery.isError) {
    return <Text>Could not load this profile.</Text>;
  }

  const profile = profileQuery.data;

  const ageRange = profile
    ? AGE_RANGES.find((age) => age === profile.age_range)
    : undefined;

  const interests = profile
    ? ACTIVITY_CATEGORIES.filter((category) =>
        profile.interests.includes(category),
      )
    : [];

  const initialValues: FamilyProfileFormValues | undefined =
    profile
      ? {
          firstName: profile.first_name,
          ageRange: ageRange ?? null,
          interests: [...interests],
        }
      : undefined;

  const error =
    updateMutation.error ?? createMutation.error;

  return (
    <View style={{ flex: 1 }}>
      <FamilyProfileForm
        key={id ?? "new"}
        initialValues={initialValues}
        onSave={handleSave}
        isSaving={isSaving}
        saveError={error?.message}
      />
    </View>
  );
}
