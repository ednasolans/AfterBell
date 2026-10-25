import { Stack } from "expo-router";

import AreaGuard from "@/features/auth/AreaGuard";

export default function GroupLayout() {
  return (
    <AreaGuard area="customer">
      <Stack>
        <Stack.Screen name="customer-home" options={{ title: "Activities" }} />
        <Stack.Screen
          name="activity-detail/[id]"
          options={{ title: "Activity" }}
        />
      </Stack>
    </AreaGuard>
  );
}