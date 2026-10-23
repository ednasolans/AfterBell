import { resolveRedirect } from './authRouting';

describe('resolveRedirect', () => {
  it('sends users without an account out of the private areas', () => {
    expect(resolveRedirect('(customer)', null)).toBe('/login');
    expect(resolveRedirect('(provider)', undefined)).toBe('/login');
  });

  it('keeps users without an account on the cover screen', () => {
    expect(resolveRedirect(undefined, null)).toBeNull();
  });

  it('keeps users without an account in the auth group', () => {
    expect(resolveRedirect('(auth)', null)).toBeNull();
  });

  it('sends customers to the customer area', () => {
    expect(resolveRedirect('(auth)', 'customer')).toBe('/customer-home');
    expect(resolveRedirect('(provider)', 'customer')).toBe('/customer-home');
    expect(resolveRedirect(undefined, 'customer')).toBe('/customer-home');
  });

  it('sends companies to the provider area', () => {
    expect(resolveRedirect('(auth)', 'company')).toBe('/provider-home');
    expect(resolveRedirect('(customer)', 'company')).toBe('/provider-home');
  });

  it('does not redirect users who are already in their area', () => {
    expect(resolveRedirect('(customer)', 'customer')).toBeNull();
    expect(resolveRedirect('(provider)', 'company')).toBeNull();
  });
});