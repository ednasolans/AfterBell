import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import AuthGate from './AuthGate';

const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };
let mockSegments: string[] = [];
let mockNavigationKey: string | undefined = 'root';
let mockAuthState: { account: { account_type: string } | null; loading: boolean } = {
  account: null,
  loading: false,
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useSegments: () => mockSegments,
  useRootNavigationState: () => ({ key: mockNavigationKey }),
}));

jest.mock('./useAccount', () => ({
  useAccount: () => mockAuthState,
}));

async function renderGate() {
  return render(
    <AuthGate>
      <Text>content</Text>
    </AuthGate>,
  );
}

describe('AuthGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSegments = [];
    mockNavigationKey = 'root';
    mockAuthState = { account: null, loading: false };
  });

  it('shows a spinner and does not redirect while loading', async () => {
    mockAuthState = { account: null, loading: true };

    const { queryByText } = await renderGate();

    expect(queryByText('content')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect until the navigator is ready', async () => {
    mockNavigationKey = undefined;
    mockSegments = ['(customer)'];

    const { getByText } = await renderGate();

    expect(getByText('content')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('sends users without an account to the login screen', async () => {
    mockSegments = ['(customer)'];

    const { getByText } = await renderGate();

    expect(getByText('content')).toBeTruthy();
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('leaves users without an account on the cover screen', async () => {
    mockSegments = [];

    const { getByText } = await renderGate();

    expect(getByText('content')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('sends customers to the customer area', async () => {
    mockSegments = ['(auth)'];
    mockAuthState = { account: { account_type: 'customer' }, loading: false };

    await renderGate();

    expect(mockReplace).toHaveBeenCalledWith('/customer-home');
  });

  it('sends companies to the provider area', async () => {
    mockSegments = ['(auth)'];
    mockAuthState = { account: { account_type: 'company' }, loading: false };

    await renderGate();

    expect(mockReplace).toHaveBeenCalledWith('/provider-home');
  });

  it('leaves users who are already in their area alone', async () => {
    mockSegments = ['(provider)'];
    mockAuthState = { account: { account_type: 'company' }, loading: false };

    await renderGate();

    expect(mockReplace).not.toHaveBeenCalled();
  });
});