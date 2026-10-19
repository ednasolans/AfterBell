import { emptyToNull } from "./text";

describe("emptyToNull", () => {
  it.each(["", "   "])("returns null for %j", (value) => {
    expect(emptyToNull(value)).toBeNull();
  });

  it("returns the text without surrounding spaces", () => {
    expect(emptyToNull("  Carrer Major 1 ")).toBe("Carrer Major 1");
  });
});
