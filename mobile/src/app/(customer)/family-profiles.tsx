
import { useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

import { FamilyProfilesList } from
  "@/features/family-profiles/components/FamilyProfilesList";

import { useFamilyUser } from
  "@/features/family-profiles/hooks/useFamilyUser";

export default function FamilyProfilesScreen() {
  const router = useRouter();
  const { userId, loading } = useFamilyUser();

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
    />
  );
}
