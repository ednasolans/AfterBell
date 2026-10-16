import { addTimeSlot, isValidTime, isValidTimeSlot, removeTimeSlot } from './schedule';
import { type TimeSlot } from './types';

// Reusable slots for the add/remove tests
const MONDAY: TimeSlot = { day: 'monday', startTime: '17:00', endTime: '18:30' };
const WEDNESDAY: TimeSlot = { day: 'wednesday', startTime: '17:00', endTime: '18:30' };
const FRIDAY: TimeSlot = { day: 'friday', startTime: '10:00', endTime: '11:00' };

describe('isValidTime', () => {
  it.each(['00:00', '09:30', '12:30', '23:59'])('accepts %s', (time) => {
    expect(isValidTime(time)).toBe(true);
  });

  it.each(['24:00', '12:60', '9:30', '', 'noon'])('rejects "%s"', (time) => {
    expect(isValidTime(time)).toBe(false);
  });
});

describe('isValidTimeSlot', () => {
  it.each<TimeSlot>([
    { day: 'monday', startTime: '09:00', endTime: '10:00' },
    { day: 'tuesday', startTime: '14:30', endTime: '15:30' },
  ])('accepts $startTime-$endTime', (slot) => {
    expect(isValidTimeSlot(slot)).toBe(true);
  });

  it.each<TimeSlot>([
    { day: 'monday', startTime: '10:00', endTime: '09:00' }, // ends before it starts
    { day: 'monday', startTime: '10:00', endTime: '10:00' }, // same start and end
    { day: 'monday', startTime: '9:00', endTime: '10:00' }, // invalid start time
    { day: 'monday', startTime: '09:00', endTime: '25:00' }, // invalid end time
  ])('rejects $startTime-$endTime', (slot) => {
    expect(isValidTimeSlot(slot)).toBe(false);
  });
});

describe('addTimeSlot', () => {
  it('adds a slot to an empty schedule', () => {
    expect(addTimeSlot([], MONDAY)).toEqual([MONDAY]);
  });

  it('orders slots by day of the week, not alphabetically', () => {
    const schedule = addTimeSlot([MONDAY, FRIDAY], WEDNESDAY);
    expect(schedule.map((slot) => slot.day)).toEqual(['monday', 'wednesday', 'friday']);
  });

  it('orders slots of the same day by start time', () => {
    const morning: TimeSlot = { day: 'monday', startTime: '09:00', endTime: '10:00' };
    expect(addTimeSlot([MONDAY], morning)).toEqual([morning, MONDAY]);
  });

  it('does not modify the original schedule', () => {
    const original = [MONDAY, FRIDAY];
    addTimeSlot(original, WEDNESDAY);
    expect(original).toEqual([MONDAY, FRIDAY]);
  });
});

describe('removeTimeSlot', () => {
  it('removes the slot at the given position', () => {
    expect(removeTimeSlot([MONDAY, WEDNESDAY, FRIDAY], 1)).toEqual([MONDAY, FRIDAY]);
  });

  it('does not modify the original schedule', () => {
    const original = [MONDAY, WEDNESDAY];
    removeTimeSlot(original, 0);
    expect(original).toEqual([MONDAY, WEDNESDAY]);
  });

  it('returns the same slots when the position does not exist', () => {
    expect(removeTimeSlot([MONDAY], 5)).toEqual([MONDAY]);
  });
});