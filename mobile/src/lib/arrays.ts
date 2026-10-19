export function toggleItemInArray<T>(array: readonly T[], item: T): T[] {
  if (array.includes(item)) {
    return array.filter((i) => i !== item);
  } else {
    return [...array, item];
  }
}
