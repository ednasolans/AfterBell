import { parseInteger } from "./numbers";

describe("parseInteger", () => {
  it.each([
    ["12", 12],
    [" 7 ", 7],
    ["0", 0],
  ])("parses %j as %d", (text, expected) => {
    expect(parseInteger(text)).toBe(expected);
  });

  it.each(["", "   ", "1.5", "1,5", "-3", "12a", "1e3"])(
    "returns null for %j",
    (text) => {
      expect(parseInteger(text)).toBeNull();
    },
  );
});
