import { fireEvent, render } from '@testing-library/react-native';

import LoadingButton from './LoadingButton';

describe('LoadingButton', () => {
  it('shows the label and calls onPress', async () => {
    const onPress = jest.fn();
    const { getByRole, getByText } = await render(
      <LoadingButton label="Save" onPress={onPress} />,
    );

    await fireEvent.press(getByRole('button'));

    expect(getByText('Save')).toBeTruthy();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('hides the label and ignores presses while loading', async () => {
    const onPress = jest.fn();
    const { getByRole, queryByText } = await render(
      <LoadingButton label="Save" onPress={onPress} loading />,
    );

    await fireEvent.press(getByRole('button'));

    expect(queryByText('Save')).toBeNull();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders the outline variant', async () => {
    const { getByText } = await render(
      <LoadingButton label="Cancel" onPress={jest.fn()} variant="outline" />,
    );

    expect(getByText('Cancel')).toBeTruthy();
  });
});