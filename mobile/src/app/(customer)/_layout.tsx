import { Stack } from "expo-router";
import { type ReactNode } from "react";

import AreaGuard from "@/features/auth/AreaGuard";
import { FavouritesProfileProvider } from "@/features/catalog/favouritesProfile";

import {
  ActiveProfileProvider,
  useActiveProfile,
} from "../../features/family-profiles/context/ActiveProfileProvider";
import { ActiveProfileSelector } from "../../features/family-profiles/components/ActiveProfileSelector";

function CustomerHeaderRight() {
  return <ActiveProfileSelector />;
}

// Favourites belong to the active family profile: the catalog gets it here,
// so it does not import from family-profiles
function ActiveProfileFavourites({ children }: { children: ReactNode }) {
  const { activeProfileId } = useActiveProfile();
  return (
    <FavouritesProfileProvider profileId={activeProfileId}>
      {children}
    </FavouritesProfileProvider>
  );
}

export default function GroupLayout() {
  return (
    <AreaGuard area="customer">
      <ActiveProfileProvider>
        <ActiveProfileFavourites>
          <Stack
            screenOptions={{
              headerShown: true,
              headerRight: CustomerHeaderRight,
            }}
          >
            <Stack.Screen
              name="customer-home"
              // The home draws its own header, with the active profile
              options={{ title: "Activities", headerShown: false }}
            />
            <Stack.Screen
              name="activities/[id]"
              options={{ title: "Activity" }}
            />
            <Stack.Screen
              name="my-requests"
              options={{ title: "My requests" }}
            />
            <Stack.Screen name="favourites" options={{ title: "Favourites" }} />
          </Stack>
        </ActiveProfileFavourites>
      </ActiveProfileProvider>
    </AreaGuard>
  );
}
