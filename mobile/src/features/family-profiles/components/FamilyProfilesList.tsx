
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useFamilyProfiles } from "../hooks/useFamilyProfiles";

type Props = {
  userId: string;
  onCreate: () => void;
  onEdit: (id: string) => void;
};

export function FamilyProfilesList({
  userId,
  onCreate,
  onEdit,
}: Props) {
  const {
    data: profiles,
    isPending,
    isError,
    refetch,
  } = useFamilyProfiles(userId);

  if (isPending) {
    return (
      <View style={styles.container}>
        <ActivityIndicator accessibilityLabel="Loading profiles" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Text>Could not load family profiles.</Text>

        <Pressable onPress={() => void refetch()}>
          <Text style={styles.link}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>My family</Text>

      {profiles?.length === 0 ? (
        <View style={styles.empty}>
          <Text>You don't have any profiles yet.</Text>

          <Pressable
            accessibilityRole="button"
            onPress={onCreate}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              Create your first profile
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {profiles?.map((profile) => (
            <View key={profile.id} style={styles.card}>
              <Text style={styles.name}>
                {profile.first_name}
              </Text>

              <Text>Age: {profile.age_range}</Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${profile.first_name}`}
                onPress={() => onEdit(profile.id)}
              >
                <Text style={styles.link}>Edit profile</Text>
              </Pressable>
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={onCreate}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              Add another profile
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  empty: {
    gap: 16,
    paddingVertical: 24,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 10,
    gap: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
  },
  link: {
    color: "#2563eb",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
  },
});
