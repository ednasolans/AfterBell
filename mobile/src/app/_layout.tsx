import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";

import AuthGate from "@/features/auth/AuthGate";
import { AuthProvider } from "@/features/auth/useAccount";
import { queryClient } from "@/lib/queryClient";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false  }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(customer)" options={{ headerShown: false }} />
            <Stack.Screen name="(provider)" options={{ headerShown: false }} />
          </Stack>
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}