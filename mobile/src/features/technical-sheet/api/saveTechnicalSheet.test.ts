import { supabase } from '../../../lib/supabase';
import { type TechnicalSheetForm } from '../types';
import { saveTechnicalSheet } from './saveTechnicalSheet';
import { toTechnicalSheetInsert } from './toTechnicalSheetInsert';

// Replace the real client: tests must not need a database or environment variables
jest.mock('../../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const SHEET: TechnicalSheetForm = {
  name: 'Lleida Swimming Club',
  providerType: 'sports_club',
  city: 'Lleida',
  address: '',
  phoneNumber: '973 000 000',
  email: '',
  website: '',
  activityTypes: ['swimming'],
  targetAgeRanges: ['7-9'],
  schedule: [{ day: 'monday', startTime: '17:00', endTime: '18:30' }],
  priceMin: 30,
  priceMax: 45,
  pricePeriod: 'per_month',
  facilities: [],
};

const insert = jest.fn();

beforeEach(() => {
  insert.mockReset();
  jest
    .mocked(supabase.from)
    .mockReturnValue({ insert } as unknown as ReturnType<typeof supabase.from>);
});

describe('saveTechnicalSheet', () => {
  it('inserts the mapped row into technical_sheets', async () => {
    insert.mockResolvedValue({ error: null });

    await saveTechnicalSheet(SHEET);

    expect(supabase.from).toHaveBeenCalledWith('technical_sheets');
    expect(insert).toHaveBeenCalledWith(toTechnicalSheetInsert(SHEET));
  });

  it('throws when the database rejects the row', async () => {
    insert.mockResolvedValue({ error: { message: 'new row violates row-level security policy' } });

    await expect(saveTechnicalSheet(SHEET)).rejects.toThrow('row-level security');
  });
});