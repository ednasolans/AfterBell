import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import LogoutButton from './LogoutButton';

const mockReplace = jest.fn();
const mockSignOut = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { signOut: () => mockSignOut() } },
}));

describe('LogoutButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs out and redirects to /login', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    const { getByRole } = await render(<LogoutButton />);

    await fireEvent.press(getByRole('button'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('does not redirect when sign out fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSignOut.mockResolvedValue({ error: { message: 'boom' } });
    const { getByRole } = await render(<LogoutButton />);

    await fireEvent.press(getByRole('button'));

    await waitFor(() => expect(consoleError).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('shows the loading state while signing out', async () => {
    let resolveSignOut: (value: { error: null }) => void = () => {};
    mockSignOut.mockReturnValue(
      new Promise((resolve) => {
        resolveSignOut = resolve;
      }),
    );
    const { getByRole, getByText, queryByText } = await render(<LogoutButton />);

    // Do not await the press yet: it only settles once signOut resolves.
    const press = fireEvent.press(getByRole('button'));
    await waitFor(() => expect(queryByText('Log out')).toBeNull());

    await act(async () => {
      resolveSignOut({ error: null });
    });
    await press;
    await waitFor(() => expect(getByText('Log out')).toBeTruthy());
  });
});