import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { colors } from "@/theme/colors";

import { useFavouritesProfileId } from "../favouritesProfile";
import { useToggleFavourite } from "../hooks/useToggleFavourite";

type FavouriteButtonProps = {
  activityId: string;
  activityTitle: string;
  isFavourite: boolean;
};

// The heart of an activity for the active family profile. It changes at once;
// useToggleFavourite undoes the change and shows an alert if the request fails.
export function FavouriteButton({
  activityId,
  activityTitle,
  isFavourite,
}: Readonly<FavouriteButtonProps>) {
  const toggle = useToggleFavourite();
  // Favourites belong to a family profile: without one, there is no heart
  const profileId = useFavouritesProfileId();

  if (!profileId) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        isFavourite
          ? `Remove ${activityTitle} from favourites`
          : `Save ${activityTitle} in favourites`
      }
      accessibilityState={{ selected: isFavourite, disabled: toggle.isPending }}
      // A second tap before the answer would send the opposite request
      disabled={toggle.isPending}
      onPress={() => toggle.mutate({ activityId, save: !isFavourite })}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons
        name={isFavourite ? "heart" : "heart-outline"}
        size={18}
        color={isFavourite ? colors.danger : colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.7 },
});
