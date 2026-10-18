import { fireEvent, render, screen } from '@testing-library/react-native';

import { MultiSelect } from './MultiSelect';
import { type SelectOption } from './OptionsModal';

type Fruit = 'apple' | 'pear' | 'plum';

const OPTIONS: SelectOption<Fruit>[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'pear', label: 'Pear' },
  { value: 'plum', label: 'Plum' },
];

describe('MultiSelect', () => {
  it('shows the placeholder when nothing is selected', async () => {
    await render(
      <MultiSelect
        label="Fruits"
        values={[]}
        options={OPTIONS}
        onChange={jest.fn()}
        placeholder="Choose fruits"
      />,
    );

    expect(screen.getByText('Choose fruits')).toBeOnTheScreen();
  });

  it('shows the selected labels separated by commas, in the options order', async () => {
    await render(
      <MultiSelect
        label="Fruits"
        values={['plum', 'apple']}
        options={OPTIONS}
        onChange={jest.fn()}
        placeholder="Choose fruits"
      />,
    );

    expect(screen.getByText('Apple, Plum')).toBeOnTheScreen();
  });

  it('adds and removes options without closing the list', async () => {
    const onChange = jest.fn();
    await render(
      <MultiSelect
        label="Fruits"
        values={['apple']}
        options={OPTIONS}
        onChange={onChange}
        placeholder="Choose fruits"
      />,
    );

    await fireEvent.press(screen.getByText('Apple'));
    await fireEvent.press(screen.getByRole('checkbox', { name: /^Pear/ }));
    expect(onChange).toHaveBeenLastCalledWith(['apple', 'pear']);

    await fireEvent.press(screen.getByRole('checkbox', { name: /^Apple/ }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('closes the list with "Done"', async () => {
    await render(
      <MultiSelect
        label="Fruits"
        values={[]}
        options={OPTIONS}
        onChange={jest.fn()}
        placeholder="Choose fruits"
      />,
    );

    await fireEvent.press(screen.getByText('Choose fruits'));
    await fireEvent.press(screen.getByText('Done'));

    expect(screen.queryByText('Done')).not.toBeOnTheScreen();
  });
});