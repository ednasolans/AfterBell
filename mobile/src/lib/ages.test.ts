import { AGE_RANGES, AGE_RANGE_LABELS } from './ages';

describe('age ranges', () => {
  it('has a non-empty label for every range', () => {
    AGE_RANGES.forEach((range) => {
      expect(AGE_RANGE_LABELS[range].trim()).not.toBe('');
    });
  });
});