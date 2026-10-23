import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import AreaGuard from './AreaGuard';

let mockAuthState: { account: { account_type: string } | null; loading: boolean } = {
  account: null,
  loading: false,
};

jest.mock('expo-router', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Text: RNText } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Redirect: ({ href }: { href: string }) => createElement(RNText, null, `redirect:${href}`),
  };
});

jest.mock('./useAccount', () => ({
  useAccount: () => mockAuthState,
}));

async function renderGuard(area: 'provider' | 'customer') {
  return render(
    <AreaGuard area={area}>
      <Text>content</Text>
    </AreaGuard>,
  );
}

function signedInAs(accountType: string) {
  mockAuthState = { account: { account_type: accountType }, loading: false };
}

describe('AreaGuard', () => {
  beforeEach(() => {
    mockAuthState = { account: null, loading: false };
  });

  it('renders the provider area for companies', async () => {
    signedInAs('company');

    const { getByText } = await renderGuard('provider');

    expect(getByText('content')).toBeTruthy();
  });

  it('keeps customers out of the provider area', async () => {
    signedInAs('customer');

    const { getByText, queryByText } = await renderGuard('provider');

    expect(queryByText('content')).toBeNull();
    expect(getByText('redirect:/customer-home')).toBeTruthy();
  });

  it('keeps users without an account out of the provider area', async () => {
    const { getByText, queryByText } = await renderGuard('provider');

    expect(queryByText('content')).toBeNull();
    expect(getByText('redirect:/login')).toBeTruthy();
  });

  it('renders the customer area for customers', async () => {
    signedInAs('customer');

    const { getByText } = await renderGuard('customer');

    expect(getByText('content')).toBeTruthy();
  });

  it('keeps companies out of the customer area', async () => {
    signedInAs('company');

    const { getByText, queryByText } = await renderGuard('customer');

    expect(queryByText('content')).toBeNull();
    expect(getByText('redirect:/provider-home')).toBeTruthy();
  });

  it('renders nothing while the account is loading', async () => {
    mockAuthState = { account: null, loading: true };

    const { queryByText } = await renderGuard('provider');

    expect(queryByText('content')).toBeNull();
    expect(queryByText(/redirect:/)).toBeNull();
  });
});