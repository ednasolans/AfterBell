
import { Stack } from "expo-router";

import { ActiveProfileProvider } from "../../features/family-profiles/context/ActiveProfileProvider";
import { ActiveProfileSelector } from "../../features/family-profiles/components/ActiveProfileSelector";

export default function GroupLayout() {
  return (
    <ActiveProfileProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerRight: () => <ActiveProfileSelector />,
        }}
      />
    </ActiveProfileProvider>
  );
}
