import { TimeSlot, WEEK_DAYS } from './types';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(time: string): boolean {
  return TIME_PATTERN.test(time);
}

export function isValidTimeSlot(slot: TimeSlot): boolean {
	return isValidTime(slot.startTime) && isValidTime(slot.endTime) && slot.startTime < slot.endTime;
}

// Order for sort(): negative → a goes first, positive → b goes first, 0 → same position
function compareTimeSlots(a: TimeSlot, b: TimeSlot): number {
  const dayDifference = WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day);
  if (dayDifference !== 0) {
    return dayDifference;
  }
  return a.startTime.localeCompare(b.startTime);
}

export function addTimeSlot(schedule: readonly TimeSlot[], slot: TimeSlot): TimeSlot[] {
  return [...schedule, slot].sort(compareTimeSlots);
}

export function removeTimeSlot(schedule: readonly TimeSlot[], index: number): TimeSlot[] {
  return schedule.filter((_, i) => i !== index);
}