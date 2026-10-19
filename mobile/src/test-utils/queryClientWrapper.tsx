import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";

// A fresh client per test, so no test sees the cache of another one.
// - retry: false -> failing requests fail at once instead of retrying.
// - gcTime: Infinity -> no cache clean-up timers are left running after the
//   test, which would keep Jest from exiting.
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

// Wrapper for renderHook/render: components and hooks under test need a QueryClientProvider
export function createQueryClientWrapper(queryClient: QueryClient) {
  return function QueryClientWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}
