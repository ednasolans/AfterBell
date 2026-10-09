import {isValidPassword } from './validation';

describe('isValidPassword', () => {
  it('accepts passwords with at least 8 characters', () => {
    expect(isValidPassword('12345678')).toBe(true);
  });

  it('rejects shorter passwords', () => {
    expect(isValidPassword('1234567')).toBe(false);
  });
});