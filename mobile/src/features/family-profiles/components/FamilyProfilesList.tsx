
import {
  ActivityIndicator,
  Alert,
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
  onDelete: (id: string) => Promise<void>;
  isDeleting?: boolean;
};

export function FamilyProfilesList({
  userId,
  onCreate,
  onEdit,
  onDelete,
  isDeleting = false,
}: Props) {
  const {
    data: profiles,
    isPending,
    isError,
    refetch,
  } = useFamilyProfiles(userId);

  function confirmDelete(id: string, firstName: string) {
    Alert.alert(
      "Delete profile",
      `Are you sure you want to delete ${firstName}&apos;s profile? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void onDelete(id).catch((error: unknown) => {
              const message =
                error instanceof Error
                  ? error.message
                  : "Could not delete profile.";

              Alert.alert("Delete failed", message);
            });
          },
        },
      ],
    );
  }

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

        <Pressable
          accessibilityRole="button"
          onPress={() => void refetch()}
        >
          <Text style={styles.link}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  // The API sorts by created_at and id.
  // The oldest profile is the protected main profile.
  const mainProfileId = profiles?.[0]?.id;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>My family</Text>

      {profiles?.length === 0 ? (
        <View style={styles.empty}>
          <Text>You don&apos;t have any profiles yet.</Text>

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
          {profiles?.map((profile) => {
            const isMain = profile.id === mainProfileId;

            return (
              <View key={profile.id} style={styles.card}>
                <Text style={styles.name}>
                  {profile.first_name}
                </Text>

                {isMain ? (
                  <Text style={styles.mainLabel}>
                    Main profile
                  </Text>
                ) : null}

                <Text>Age: {profile.age_range}</Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${profile.first_name}`}
                  onPress={() => onEdit(profile.id)}
                >
                  <Text style={styles.link}>
                    Edit profile
                  </Text>
                </Pressable>

                {!isMain ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${profile.first_name}`}
                    disabled={isDeleting}
                    onPress={() =>
                      confirmDelete(
                        profile.id,
                        profile.first_name,
                      )
                    }
                  >
                    <Text style={styles.deleteText}>
                      Delete profile
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          <Pressable
            accessibilityRole="button"
            onPress={onCreate}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              Add another profile
            </Text>
          </Pressable>

          {isDeleting ? (
            <ActivityIndicator accessibilityLabel="Deleting profile" />
          ) : null}
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
  mainLabel: {
    color: "#2563eb",
    fontWeight: "600",
  },
  link: {
    color: "#2563eb",
    fontWeight: "600",
  },
  deleteText: {
    color: "#b91c1c",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
