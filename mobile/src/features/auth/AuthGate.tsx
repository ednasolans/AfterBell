import { type ReactNode, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';

import { resolveRedirect } from './authRouting';
import { useAccount } from './useAccount';

export default function AuthGate({ children }: Readonly<{ children: ReactNode }>) {
  const { account, loading } = useAccount();
  const segments = useSegments();
  const router = useRouter();
  const navigationReady = Boolean(useRootNavigationState()?.key);

  const [group] = segments as string[];
  const accountType = account?.account_type ?? null;

  useEffect(() => {
    if (loading || !navigationReady) return;

    const target = resolveRedirect(group, accountType);
    if (target) router.replace(target);
  }, [loading, navigationReady, group, accountType, router]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});