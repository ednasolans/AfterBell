
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Text,
  View,
} from "react-native";

import { FamilyProfilesList } from "@/features/family-profiles/components/FamilyProfilesList";
import { useFamilyUser } from "@/features/family-profiles/hooks/useFamilyUser";
import { useDeleteFamilyProfile } from "@/features/family-profiles/hooks/useFamilyProfiles";

export default function FamilyProfilesScreen() {
  const router = useRouter();

  const { userId, loading } = useFamilyUser();
  const deleteMutation = useDeleteFamilyProfile();

  if (loading) {
    return <ActivityIndicator />;
  }

  if (!userId) {
    return (
      <View>
        <Text>You must be logged in.</Text>
      </View>
    );
  }

  return (
    <FamilyProfilesList
      userId={userId}
      onCreate={() =>
        router.push("/family-profile-form")
      }
      onEdit={(id) =>
        router.push({
          pathname: "/family-profile-form",
          params: { id },
        })
      }
      onDelete={async (id) => {
        await deleteMutation.mutateAsync(id);
      }}
      isDeleting={deleteMutation.isPending}
    />
  );
}
