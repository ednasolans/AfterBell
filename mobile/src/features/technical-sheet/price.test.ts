import { parsePrice } from './price';

describe('parsePrice', () => {
  it.each([
    ['30', 30],
    ['0', 0],
    ['30.5', 30.5],
    ['30,5', 30.5],
    ['12,99', 12.99],
    [' 45 ', 45],
    ['-5', -5],
  ])('parses "%s" as %d', (text, expected) => {
    expect(parsePrice(text)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '30abc', '1e3', '30,555', '30.', ',5', '1.000,50'])(
    'returns null for "%s"',
    (text) => {
      expect(parsePrice(text)).toBeNull();
    },
  );
});