export type AuthRedirect = '/login' | '/provider-home' | '/customer-home';

/**
 * Decides where the user must be, given the route group they are in
 * and the account type they have (null when there is no session/account).
 * Returns null when they are already in the right place.
 * Users without an account may stay in the (auth) group or on the cover
 * screen (the root route, which has no group); everyone else goes to /login.
 *
 * NOTE: 'company' is assumed to be the provider account type.
 */
export function resolveRedirect(
  group: string | undefined,
  accountType: string | null | undefined,
): AuthRedirect | null {
  if (!accountType) {
    return group === '(auth)' || group === undefined ? null : '/login';
  }

  const isProvider = accountType === 'company';
  const expectedGroup = isProvider ? '(provider)' : '(customer)';

  if (group === expectedGroup) return null;
  return isProvider ? '/provider-home' : '/customer-home';
}