import { toggleItemInArray } from './arrays';
describe('toggleItemInArray', () => {
    it('adds an element that was not in the array', () => {
        const arr = [1, 2, 3];
        const newArr = toggleItemInArray(arr, 4);
        expect(newArr).toEqual([1, 2, 3, 4]);
    });
    it('removes an element that was in the array', () => {
        const arr = [1, 2, 3];
        const newArr = toggleItemInArray(arr, 2);
        expect(newArr).toEqual([1, 3]);
    });
    it('does not modify the original array when adding an element', () => {
        const arr = [1, 2, 3];
        const newArr = toggleItemInArray(arr, 4);
        expect(arr).toEqual([1, 2, 3]);
    });
});
