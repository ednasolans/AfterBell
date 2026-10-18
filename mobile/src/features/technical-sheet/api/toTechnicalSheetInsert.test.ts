import { type TechnicalSheetForm } from '../types';
import { toTechnicalSheetInsert } from './toTechnicalSheetInsert';

const VALID_SHEET: TechnicalSheetForm = {
  name: '  Lleida Swimming Club ',
  providerType: 'sports_club',
  city: ' Lleida ',
  address: '',
  phoneNumber: '973 000 000',
  email: '',
  website: '   ',
  activityTypes: ['swimming'],
  targetAgeRanges: ['7-9', '10-12'],
  schedule: [{ day: 'monday', startTime: '17:00', endTime: '18:30' }],
  priceMin: 30,
  priceMax: 45.5,
  pricePeriod: 'per_month',
  facilities: ['showers'],
};

describe('toTechnicalSheetInsert', () => {
  it('converts every field to its database column', () => {
    expect(toTechnicalSheetInsert(VALID_SHEET)).toEqual({
      name: 'Lleida Swimming Club',
      provider_type: 'sports_club',
      city: 'Lleida',
      address: null,
      phone_number: '973 000 000',
      email: null,
      website: null,
      activity_types: ['swimming'],
      target_age_ranges: ['7-9', '10-12'],
      schedule: [{ day: 'monday', startTime: '17:00', endTime: '18:30' }],
      price_min: 30,
      price_max: 45.5,
      price_period: 'per_month',
      facilities: ['showers'],
    });
  });

  it('does not send provider_id, so the database uses the logged-in user', () => {
    expect(toTechnicalSheetInsert(VALID_SHEET)).not.toHaveProperty('provider_id');
  });

  it('keeps optional fields that have a value, without surrounding spaces', () => {
    const row = toTechnicalSheetInsert({ ...VALID_SHEET, email: ' info@club.cat ' });
    expect(row.email).toBe('info@club.cat');
  });

  it.each<Partial<TechnicalSheetForm>>([
    { providerType: null },
    { priceMin: null },
    { priceMax: null },
    { pricePeriod: null },
  ])('throws if the sheet was not validated (%o)', (changes) => {
    expect(() => toTechnicalSheetInsert({ ...VALID_SHEET, ...changes })).toThrow();
  });
});