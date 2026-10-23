import { Stack } from "expo-router";

import AreaGuard from "@/features/auth/AreaGuard";

export default function GroupLayout() {
  return (
    <AreaGuard area="customer">
      <Stack />
    </AreaGuard>
  );
}