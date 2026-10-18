import { fireEvent, render, screen } from '@testing-library/react-native';

import { PriceField } from './PriceField';

describe('PriceField', () => {
  it('sends the parsed number while keeping the typed text', async () => {
    const onChange = jest.fn();
    await render(<PriceField label="Minimum price (€)" value={null} onChange={onChange} />);

    await fireEvent.changeText(screen.getByPlaceholderText('0,00'), '30,5');

    expect(onChange).toHaveBeenLastCalledWith(30.5);
    expect(screen.getByDisplayValue('30,5')).toBeOnTheScreen();
  });

  it('keeps incomplete text and sends null', async () => {
    const onChange = jest.fn();
    await render(<PriceField label="Minimum price (€)" value={null} onChange={onChange} />);

    await fireEvent.changeText(screen.getByPlaceholderText('0,00'), '30,');

    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByDisplayValue('30,')).toBeOnTheScreen();
  });

  it('shows the initial value and the error', async () => {
    await render(
      <PriceField label="Maximum price (€)" value={45} onChange={jest.fn()} error="Too low" />,
    );

    expect(screen.getByDisplayValue('45')).toBeOnTheScreen();
    expect(screen.getByText('Too low')).toBeOnTheScreen();
  });
});