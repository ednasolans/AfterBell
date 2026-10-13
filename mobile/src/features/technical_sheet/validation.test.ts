import { EMPTY_TECHNICAL_SHEET_FORM, type TechnicalSheetForm } from './types';
import { validateTechnicalSheet } from './validation';

describe('validateTechnicalSheet', () => {
  it('returns errors for an empty technical sheet', () => {
    const sheet: TechnicalSheetForm = EMPTY_TECHNICAL_SHEET_FORM;

    const errors = validateTechnicalSheet(sheet);
    expect(errors).toEqual({
        name: 'Name is required',
        providerType: 'Select a provider type',
        city: 'City is required',
        phoneNumber: 'Enter a phone number or an email',
        activityTypes: 'At least one activity type is required',
        targetAgeRanges: 'At least one target age range is required',
        schedule: 'At least one time slot is required',
        priceMin: 'Minimum price is required',
        priceMax: 'Maximum price is required',
    });
  });

  it('returns no errors for a valid technical sheet', () => {
    const sheet: TechnicalSheetForm = {
        name: 'Some Name',
        address: 'Some Address',
        providerType: 'sports_club',
        city: 'Some City',
        website: '',
        phoneNumber: '1234567890',
        email: 'user@example.com',
        activityTypes: ['football'],
        targetAgeRanges: ['0-3', '4-6'],
        schedule: [{ day: 'monday', startTime: '09:00', endTime: '17:00' } ],
        priceMin: 10,
        priceMax: 100,
        pricePeriod: 'per_hour',
        facilities: ['facility1', 'facility2'],
    };

    const errors = validateTechnicalSheet(sheet);
    expect(errors).toEqual({});

    describe('basic information', () => {
      it('requires a name', () => {
        //TODO: Implement test for name validation
      });
    });
  });
  //TODO: Implement tests for other sections (activity, prices, etc.)
});