import { fireEvent, render, waitFor } from '@testing-library/react-native';

import LoginScreen from '../../app/(auth)/login';

const mockReplace = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockSingle = jest.fn();

jest.mock('expo-router', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    useRouter: () => ({ replace: mockReplace }),
    Link: ({ children }: { children: string }) => createElement(Text, null, children),
  };
});

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (credentials: unknown) => mockSignIn(credentials),
      signOut: () => mockSignOut(),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => mockSingle() }) }),
    }),
  },
}));

async function submitLogin(email = 'user@example.com', password = 'secret123') {
  const screen = await render(<LoginScreen />);
  await fireEvent.changeText(screen.getByPlaceholderText('Email'), email);
  await fireEvent.changeText(screen.getByPlaceholderText('Password'), password);
  await fireEvent.press(screen.getByRole('button'));
  return screen;
}

function signInSucceeds() {
  mockSignIn.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
}

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asks for email and password when they are empty', async () => {
    const { getByText } = await submitLogin('', '');

    expect(getByText('Enter your email and password.')).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows a friendly message for wrong credentials', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    });

    const { getByText } = await submitLogin();

    await waitFor(() => expect(getByText('Incorrect email or password.')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('asks to confirm the email when it is not confirmed', async () => {
    mockSignIn.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email not confirmed', code: 'email_not_confirmed' },
    });

    const { getByText } = await submitLogin();

    await waitFor(() =>
      expect(getByText('Please confirm your email before logging in.')).toBeTruthy(),
    );
  });

  it('shows other Supabase errors as they are', async () => {
    mockSignIn.mockResolvedValue({ data: { user: null }, error: { message: 'Server error' } });

    const { getByText } = await submitLogin();

    await waitFor(() => expect(getByText('Server error')).toBeTruthy());
  });

  it('redirects customers to their area', async () => {
    signInSucceeds();
    mockSingle.mockResolvedValue({ data: { account_type: 'customer' }, error: null });

    await submitLogin();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/customer-home'));
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret123' });
  });

  it('redirects companies to the provider area', async () => {
    signInSucceeds();
    mockSingle.mockResolvedValue({ data: { account_type: 'company' }, error: null });

    await submitLogin();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/provider-home'));
  });

  it('signs out when the account cannot be loaded', async () => {
    signInSucceeds();
    mockSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } });

    const { getByText } = await submitLogin();

    await waitFor(() =>
      expect(getByText('Could not load your account. Please try again.')).toBeTruthy(),
    );
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows the message of an unexpected error', async () => {
    mockSignIn.mockRejectedValue(new Error('Network down'));

    const { getByText } = await submitLogin();

    await waitFor(() => expect(getByText('Network down')).toBeTruthy());
  });

  it('shows a generic message when the thrown value is not an Error', async () => {
    mockSignIn.mockRejectedValue('boom');

    const { getByText } = await submitLogin();

    await waitFor(() => expect(getByText('Something went wrong. Please try again.')).toBeTruthy());
  });
});