import { Stack } from "expo-router";

import AreaGuard from "@/features/auth/AreaGuard";

import { ActiveProfileProvider } from "../../features/family-profiles/context/ActiveProfileProvider";
import { ActiveProfileSelector } from "../../features/family-profiles/components/ActiveProfileSelector";

function CustomerHeaderRight() {
  return <ActiveProfileSelector />;
}

export default function GroupLayout() {
  return (
    <AreaGuard area="customer">
      <ActiveProfileProvider>
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
          <Stack.Screen name="my-requests" options={{ title: "My requests" }} />
          <Stack.Screen name="favourites" options={{ title: "Favourites" }} />
        </Stack>
      </ActiveProfileProvider>
    </AreaGuard>
  );
}
