export const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export interface TimeSlot {
  day: WeekDay;
  startTime: string; // Format: HH:mm
  endTime: string;
}

export const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(time: string): boolean {
  return TIME_PATTERN.test(time);
}

export function isValidTimeSlot(slot: TimeSlot): boolean {
  return (
    isValidTime(slot.startTime) &&
    isValidTime(slot.endTime) &&
    slot.startTime < slot.endTime
  );
}

// Order for sort(): negative → a goes first, positive → b goes first, 0 → same position
function compareTimeSlots(a: TimeSlot, b: TimeSlot): number {
  const dayDifference = WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day);
  if (dayDifference !== 0) {
    return dayDifference;
  }
  return a.startTime.localeCompare(b.startTime);
}

export function addTimeSlot(
  schedule: readonly TimeSlot[],
  slot: TimeSlot,
): TimeSlot[] {
  return [...schedule, slot].sort(compareTimeSlots);
}

export function removeTimeSlot(
  schedule: readonly TimeSlot[],
  index: number,
): TimeSlot[] {
  return schedule.filter((_, i) => i !== index);
}

export function formatTimeSlot(slot: TimeSlot): string {
  return `${WEEK_DAY_LABELS[slot.day]} ${slot.startTime}–${slot.endTime}`;
}

// Builds a slot from the editor inputs, or returns null if they are not a valid slot yet
export function buildTimeSlot(
  day: WeekDay | null,
  startTime: string,
  endTime: string,
): TimeSlot | null {
  if (day === null) {
    return null;
  }
  const slot: TimeSlot = {
    day,
    startTime: startTime.trim(),
    endTime: endTime.trim(),
  };
  return isValidTimeSlot(slot) ? slot : null;
}
