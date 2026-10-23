import { type ReactNode } from 'react';
import { Redirect } from 'expo-router';

import { resolveRedirect } from './authRouting';
import { useAccount } from './useAccount';

type Props = {
  /** The area this layout protects. */
  area: 'provider' | 'customer';
  children: ReactNode;
};

/**
 * Layout-level guard for a private area. Unlike AuthGate (which redirects in an
 * effect, after the first render), this never renders the area's screens for a
 * user who is not allowed in, so a direct link cannot flash a protected screen.
 *
 * This is a UX protection only: data must also be protected with RLS policies.
 */
export default function AreaGuard({ area, children }: Readonly<Props>) {
  const { account, loading } = useAccount();

  if (loading) return null;

  const target = resolveRedirect(`(${area})`, account?.account_type ?? null);
  if (target) return <Redirect href={target} />;

  return <>{children}</>;
}