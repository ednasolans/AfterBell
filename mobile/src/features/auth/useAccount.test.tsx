import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

import { AuthProvider, useAccount } from './useAccount';

type AuthCallback = (event: string, session: unknown) => void;

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockUnsubscribe = jest.fn();
const mockSingle = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: AuthCallback) => mockOnAuthStateChange(callback),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => mockSingle() }) }),
    }),
  },
}));

const session = { user: { id: 'user-1' } };

function accountRow(accountType: string) {
  return { id: 'user-1', email: 'user@example.com', account_type: accountType, created_at: 'now' };
}

function Probe() {
  const { loading, account, session: current } = useAccount();
  return (
    <Text>
      {`loading:${loading}|type:${account?.account_type ?? 'none'}|session:${current ? 'yes' : 'no'}`}
    </Text>
  );
}

async function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe('AuthProvider / useAccount', () => {
  let authCallback: AuthCallback | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    authCallback = undefined;
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockImplementation((callback: AuthCallback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
  });

  it('returns the default state outside the provider', async () => {
    const { getByText } = await render(<Probe />);

    expect(getByText('loading:true|type:none|session:no')).toBeTruthy();
  });

  it('finishes loading with no account when there is no stored session', async () => {
    const { getByText } = await renderProvider();

    await waitFor(() => expect(getByText('loading:false|type:none|session:no')).toBeTruthy());
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it('loads the account of the stored session', async () => {
    mockGetSession.mockResolvedValue({ data: { session } });
    mockSingle.mockResolvedValue({ data: accountRow('company'), error: null });

    const { getByText } = await renderProvider();

    await waitFor(() => expect(getByText('loading:false|type:company|session:yes')).toBeTruthy());
  });

  it('has a session but no account when the account cannot be loaded', async () => {
    mockGetSession.mockResolvedValue({ data: { session } });
    mockSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } });

    const { getByText } = await renderProvider();

    await waitFor(() => expect(getByText('loading:false|type:none|session:yes')).toBeTruthy());
  });

  it('follows sign in and sign out events', async () => {
    mockSingle.mockResolvedValue({ data: accountRow('customer'), error: null });
    const { getByText } = await renderProvider();
    await waitFor(() => expect(getByText('loading:false|type:none|session:no')).toBeTruthy());

    await act(async () => {
      authCallback?.('SIGNED_IN', session);
    });
    await waitFor(() => expect(getByText('loading:false|type:customer|session:yes')).toBeTruthy());

    await act(async () => {
      authCallback?.('SIGNED_OUT', null);
    });
    await waitFor(() => expect(getByText('loading:false|type:none|session:no')).toBeTruthy());
  });

  it('unsubscribes from auth changes on unmount', async () => {
    const { unmount } = await renderProvider();

    await unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('continues as signed out when the stored session cannot be read', async () => {
    mockGetSession.mockRejectedValue(new Error('storage unavailable'));

    const { getByText } = await renderProvider();

    await waitFor(() => expect(getByText('loading:false|type:none|session:no')).toBeTruthy());
  });

  it('treats a failed account request as a missing account', async () => {
    mockGetSession.mockResolvedValue({ data: { session } });
    mockSingle.mockRejectedValue(new Error('network down'));

    const { getByText } = await renderProvider();

    await waitFor(() => expect(getByText('loading:false|type:none|session:yes')).toBeTruthy());
  });

  it('ignores a session that arrives after unmount', async () => {
    let resolveSession: (value: { data: { session: null } }) => void = () => {};
    mockGetSession.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    const { unmount } = await renderProvider();

    await unmount();
    await act(async () => {
      resolveSession({ data: { session: null } });
    });

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('ignores an account that arrives after unmount', async () => {
    let resolveAccount: (value: { data: null; error: null }) => void = () => {};
    mockGetSession.mockResolvedValue({ data: { session } });
    mockSingle.mockReturnValue(
      new Promise((resolve) => {
        resolveAccount = resolve;
      }),
    );
    const { unmount } = await renderProvider();
    await waitFor(() => expect(mockSingle).toHaveBeenCalledTimes(1));

    await unmount();
    await act(async () => {
      resolveAccount({ data: null, error: null });
    });

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});