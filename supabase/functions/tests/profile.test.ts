import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { countWords, parseProfile, ProfileValidationError } from "../_shared/profile.ts";

const words = (n: number) => Array(n).fill("paraula").join(" ");
const valid = JSON.stringify({ headline: "Música a Lleida", description: words(80) });

Deno.test("accepts a valid profile", () => {
  assertEquals(parseProfile(valid).headline, "Música a Lleida");
});

Deno.test("accepts JSON inside a code fence", () => {
  assertEquals(parseProfile("```json\n" + valid + "\n```").headline, "Música a Lleida");
});

Deno.test("rejects text that is not JSON", () => {
  assertThrows(() => parseProfile("Hola!"), ProfileValidationError);
});

Deno.test("rejects a missing field", () => {
  assertThrows(() => parseProfile(JSON.stringify({ headline: "Hola" })), ProfileValidationError);
});

Deno.test("rejects a description that is too short", () => {
  const short = JSON.stringify({ headline: "Hola", description: words(10) });
  assertThrows(() => parseProfile(short), ProfileValidationError);
});

Deno.test("rejects a headline that is too long", () => {
  const long = JSON.stringify({ headline: "a".repeat(200), description: words(80) });
  assertThrows(() => parseProfile(long), ProfileValidationError);
});

Deno.test("counts words ignoring extra spaces", () => {
  assertEquals(countWords("  una   dues tres "), 3);
});