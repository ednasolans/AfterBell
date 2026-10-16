import { type AgeRange } from "../../lib/ages";

export const PROVIDER_TYPES = [
    'sports_club',
    'music_school',
    'language_school',
    'art_school',
    'tutoring_academy',
    'private_tutor',
] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const WEEK_DAYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

export const ACTIVITY_CATEGORIES = [
    'football',
    'basketball',
    'tennis',
    'swimming',
    'dance',
    'drama',
    'music',
    'language',
    'art',
    'tutoring',
    'other',
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
    football: 'Football',
    basketball: 'Basketball',
    tennis: 'Tennis',
    swimming: 'Swimming',
    dance: 'Dance',
    drama: 'Drama',
    music: 'Music',
    language: 'Language',
    art: 'Art',
    tutoring: 'Tutoring',
    other: 'Other'
};

export const PRICE_PERIODS = [
    'per_hour',
    'per_day',
    'per_week',
    'per_month',
    'per_term',
    'per_year',
] as const;

export type PricePeriod = (typeof PRICE_PERIODS)[number];

export interface TimeSlot{
    day: WeekDay;
    startTime: string; // Format: HH:mm
    endTime: string;   
}

export interface TechnicalSheetForm {
    name: string;
    providerType: ProviderType | null;
    city: string;
    address: string;
    phoneNumber: string;
    email: string;
    website: string;
    activityTypes: ActivityCategory[];
    targetAgeRanges: AgeRange[];
    schedule: TimeSlot[];
    priceMin: number | null;
    priceMax: number | null;
    pricePeriod: PricePeriod | null;
    facilities: string[];
}

export const EMPTY_TECHNICAL_SHEET_FORM: TechnicalSheetForm = {
    name: '',
    providerType: null,
    city: '',
    address: '',
    phoneNumber: '',
    email: '',
    website: '',
    activityTypes: [],
    targetAgeRanges: [],
    schedule: [],
    priceMin: null,
    priceMax: null,
    pricePeriod: null,
    facilities: [],
};

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  sports_club: 'Sports club',
  music_school: 'Music school',
  language_school: 'Language school',
  art_school: 'Art school',
  tutoring_academy: 'Tutoring academy',
  private_tutor: 'Private tutor'
};