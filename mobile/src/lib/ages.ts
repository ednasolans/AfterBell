export const AGE_RANGES = [
    "0-3",
    "4-6",
    "7-9",
    "10-12",
    "13-15",
    "16-17",
    "adult"
] as const;

export type AgeRange = (typeof AGE_RANGES)[number];