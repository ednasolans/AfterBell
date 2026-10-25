
import { Stack } from "expo-router";

import AreaGuard from "@/features/auth/AreaGuard";

import { ActiveProfileProvider } from "../../features/family-profiles/context/ActiveProfileProvider";
import { ActiveProfileSelector } from "../../features/family-profiles/components/ActiveProfileSelector";

export default function GroupLayout() {
  return (
    <AreaGuard area="customer">
      <ActiveProfileProvider>
        <Stack
          screenOptions={{
            headerShown: true,
            headerRight: () => <ActiveProfileSelector />,
          }}
        />
      </ActiveProfileProvider>
    </AreaGuard>
  );
}
