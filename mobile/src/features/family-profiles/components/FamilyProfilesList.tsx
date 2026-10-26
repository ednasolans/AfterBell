import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useFamilyProfiles } from "../hooks/useFamilyProfiles";
import { colors } from "@/theme/colors";

type Props = Readonly<{
  userId: string;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  isDeleting?: boolean;
}>;

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

        <Pressable accessibilityRole="button" onPress={() => void refetch()}>
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
      <Text style={styles.eyebrow}>YOUR FAMILY</Text>
      <Text style={styles.title}>Family profiles</Text>
      <Text style={styles.subtitle}>
        Add profiles to discover activities that fit everyone.
      </Text>

      {profiles?.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="people-outline"
              size={34}
              color={colors.primaryDark}
            />
          </View>
          <Text style={styles.emptyTitle}>Build your family</Text>
          <Text style={styles.emptyText}>
            You don&apos;t have any profiles yet.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={onCreate}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Create your first profile</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {profiles?.map((profile) => {
            const isMain = profile.id === mainProfileId;

            return (
              <View key={profile.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Ionicons
                      name="person-outline"
                      size={25}
                      color={colors.primaryDark}
                    />
                  </View>
                  <View style={styles.nameBlock}>
                    <Text style={styles.name}>{profile.first_name}</Text>
                    {isMain ? (
                      <Text style={styles.mainLabel}>Main profile</Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textMuted}
                  />
                </View>

                <View style={styles.ageRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={colors.primaryDark}
                  />
                  <Text style={styles.age}>Age: {profile.age_range}</Text>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${profile.first_name}`}
                    onPress={() => onEdit(profile.id)}
                    style={styles.editButton}
                  >
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={colors.primaryDark}
                    />
                    <Text style={styles.link}>Edit profile</Text>
                  </Pressable>

                  {!isMain ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${profile.first_name}`}
                      disabled={isDeleting}
                      onPress={() =>
                        confirmDelete(profile.id, profile.first_name)
                      }
                    >
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}

          <Pressable
            accessibilityRole="button"
            onPress={onCreate}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Add another profile</Text>
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
    gap: 10,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  eyebrow: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  subtitle: { color: colors.textMuted, lineHeight: 21, marginBottom: 10 },
  empty: {
    gap: 16,
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  emptyText: { color: colors.textMuted },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 20,
    gap: 10,
    marginBottom: 4,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  nameBlock: { flex: 1, gap: 3 },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  mainLabel: {
    color: colors.primaryDark,
    fontWeight: "700",
    fontSize: 12,
  },
  ageRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 4 },
  age: { color: colors.textMuted },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 3,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  link: { color: colors.primaryDark, fontWeight: "700" },
  deleteText: { color: colors.danger, fontWeight: "700", padding: 8 },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: colors.white,
    fontWeight: "700",
  },
});
