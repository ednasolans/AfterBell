import { fireEvent, render } from '@testing-library/react-native';

import Index from '../../app/index';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('Cover screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the app name', async () => {
    const { getByText } = await render(<Index />);

    expect(getByText('AfterBell')).toBeTruthy();
  });

  it('opens the login screen', async () => {
    const { getByText } = await render(<Index />);

    await fireEvent.press(getByText('Log in'));

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('opens the sign up screen', async () => {
    const { getByText } = await render(<Index />);

    await fireEvent.press(getByText('Sign up'));

    expect(mockPush).toHaveBeenCalledWith('/sign-up');
  });
});