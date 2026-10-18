import { EMPTY_TECHNICAL_SHEET_FORM, type TechnicalSheetForm } from './types';
import { hasErrors, validateTechnicalSheet } from './validation';
import { ActivityCategory } from './types';
import { Facility } from './types';

const VALID_SHEET: TechnicalSheetForm = {
            name: 'Some Name',
            address: 'Some Address',
            providerType: 'sports_club',
            city: 'Some City',
            website: '',
            phoneNumber: '1234567890',
            email: 'user@example.com',
            activityTypes: ['football', 'music'] as ActivityCategory[],
            targetAgeRanges: ['0-3', '4-6'],
            schedule: [{ day: 'monday', startTime: '09:00', endTime: '17:00' } ],
            priceMin: 10,
            priceMax: 100,
            pricePeriod: 'per_hour',
            facilities: ['wifi', 'cafeteria'] as Facility[],
        };


describe('validateTechnicalSheet', () => {
    it('returns errors for an empty technical sheet', () => {
        const errors = validateTechnicalSheet(EMPTY_TECHNICAL_SHEET_FORM);
        expect(errors).toEqual({
            name: 'Name is required',
            providerType: 'Select a provider type',
            city: 'City is required',
            phoneNumber: 'Enter a phone number or an email',
            activityTypes: 'At least one activity type is required',
            targetAgeRanges: 'At least one target age range is required',
            schedule: 'Add at least one time slot',
            priceMin: 'Minimum price is required',
            priceMax: 'Maximum price is required',
            pricePeriod: 'Select how the price is charged (per hour, per month, etc.)',
        });
    });

    it('returns no errors for a valid technical sheet', () => {

        const errors = validateTechnicalSheet(VALID_SHEET);
        expect(errors).toEqual({});
    });

    describe('basic information', () => {
        it('requires a name', () => {
            const sheetWithoutName = { ...VALID_SHEET, name: '' };
            const errors = validateTechnicalSheet(sheetWithoutName);
            expect(errors.name).toBe('Name is required');
        });
        it('treats a name with only whitespace as invalid', () => {
            const sheetWithWhitespaceName = { ...VALID_SHEET, name: '   ' };
            const errors = validateTechnicalSheet(sheetWithWhitespaceName);
            expect(errors.name).toBe('Name is required');
        });
        it('requires a provider type', () => {
            const sheetWithoutProviderType = { ...VALID_SHEET, providerType: null };
            const errors = validateTechnicalSheet(sheetWithoutProviderType);
            expect(errors.providerType).toBe('Select a provider type');
        });
        it('requires a city', () => {
            const sheetWithoutCity = { ...VALID_SHEET, city: '' };
            const errors = validateTechnicalSheet(sheetWithoutCity);
            expect(errors.city).toBe('City is required');
        });
    });
    describe('contact information', () => {
        it('requires a phone number or an email', () => {
            const sheetWithoutContact = { ...VALID_SHEET, phoneNumber: '', email: '' };
            const errors = validateTechnicalSheet(sheetWithoutContact);
            expect(errors.phoneNumber).toBe('Enter a phone number or an email');
        });
        it('rejects an invalid email', () => {
            const sheetWithInvalidEmail = { ...VALID_SHEET, email: 'invalid-email' };
            const errors = validateTechnicalSheet(sheetWithInvalidEmail);
            expect(errors.email).toBe('Enter a valid email');
        });
        it('accepts only a phone number', () => {
            const sheetWithValidPhone = { ...VALID_SHEET, email: '', phoneNumber: '1234567890' };
            const errors = validateTechnicalSheet(sheetWithValidPhone);
            expect(errors.phoneNumber).toBeUndefined();
        });
    });
    describe('activity', () => {
        it('requires at least one activity type', () => {
            const sheetWithoutActivityTypes = { ...VALID_SHEET, activityTypes: [] };
            const errors = validateTechnicalSheet(sheetWithoutActivityTypes);
            expect(errors.activityTypes).toBe('At least one activity type is required');
        });
        it('requires at least one target age range', () => {
            const sheetWithoutAgeRanges = { ...VALID_SHEET, targetAgeRanges: [] };
            const errors = validateTechnicalSheet(sheetWithoutAgeRanges);
            expect(errors.targetAgeRanges).toBe('At least one target age range is required');
        });
        it('requires at least one time slot', () => {
            const sheetWithoutSchedule = { ...VALID_SHEET, schedule: [] };
            const errors = validateTechnicalSheet(sheetWithoutSchedule);
            expect(errors.schedule).toBe('Add at least one time slot');
        });
        it('treats activity types with only whitespace as empty', () => {
            const errors = validateTechnicalSheet({ ...VALID_SHEET, activityTypes: [] });
            expect(errors.activityTypes).toBeDefined();
        });
        it('rejects a schedule with an invalid time slot', () => {
            const sheet: TechnicalSheetForm = {
                ...VALID_SHEET,
                schedule: [
                { day: 'monday', startTime: '17:00', endTime: '18:00' },
                { day: 'friday', startTime: '19:00', endTime: '18:00' },
                ],
            };
            expect(validateTechnicalSheet(sheet).schedule).toBeDefined();
            });

            it('accepts a schedule with several valid time slots', () => {
            const sheet: TechnicalSheetForm = {
                ...VALID_SHEET,
                schedule: [
                { day: 'monday', startTime: '17:00', endTime: '18:00' },
                { day: 'friday', startTime: '10:00', endTime: '11:30' },
                ],
            };
            expect(validateTechnicalSheet(sheet).schedule).toBeUndefined();
            });
    });
    describe('prices', () => {
        it('requires both minimum and maximum prices', () => {
            const sheetWithoutPrices = { ...VALID_SHEET, priceMin: null, priceMax: null };
            const errors = validateTechnicalSheet(sheetWithoutPrices);
            expect(errors.priceMin).toBe('Minimum price is required');
            expect(errors.priceMax).toBe('Maximum price is required');
        });
        it('rejects negative prices', () => {
            const sheetWithNegativePrices = { ...VALID_SHEET, priceMin: -10, priceMax: -5 };
            const errors = validateTechnicalSheet(sheetWithNegativePrices);
            expect(errors.priceMin).toBe('Price cannot be negative');
            expect(errors.priceMax).toBe('Price cannot be negative');
        });
        it('rejects a maximum price that is less than the minimum price', () => {
            const sheetWithInvalidPriceRange = { ...VALID_SHEET, priceMin: 50, priceMax: 30 };
            const errors = validateTechnicalSheet(sheetWithInvalidPriceRange);
            expect(errors.priceMax).toBe('Maximum price cannot be less than minimum price');
        });
        it('accepts equal minimum and maximum prices', () => {
            const sheetWithEqualPrices = { ...VALID_SHEET, priceMin: 50, priceMax: 50 };
            const errors = validateTechnicalSheet(sheetWithEqualPrices);
            expect(errors.priceMin).toBeUndefined();
            expect(errors.priceMax).toBeUndefined();
        });
        it('accepts free services (both prices set to 0)', () => {
            const sheetWithFreeService = { ...VALID_SHEET, priceMin: 0, priceMax: 0 };
            const errors = validateTechnicalSheet(sheetWithFreeService);
            expect(errors.priceMin).toBeUndefined();
            expect(errors.priceMax).toBeUndefined();
        });
        it('requires a price period', () => {
            const errors = validateTechnicalSheet({ ...VALID_SHEET, pricePeriod: null });
            expect(errors.pricePeriod).toBeDefined();
        });
    });
});
describe('hasErrors', () => {
    it('returns false when there are no errors', () => {
        expect(hasErrors({})).toBe(false);
    });
    it('returns true when there is at least one error', () => {
        expect(hasErrors({ name: 'Name is required' })).toBe(true);
    });
});