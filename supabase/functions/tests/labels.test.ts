import { assertEquals } from "jsr:@std/assert@1";
import { toPromptData } from "../_shared/labels.ts";

const sheet = {
  name: "  Escola de Música L'Harmonia ",
  provider_type: "music_school",
  description: null,
  activity_types: ["music"],
  facilities: ["waiting_area", "not_a_real_code"],
  city: "Lleida",
};

Deno.test("translates codes into English labels", () => {
  const data = toPromptData(sheet);
  assertEquals(data.type, "music school");
  assertEquals(data.activities, ["music"]);
});

Deno.test("drops unknown codes and trims text", () => {
  const data = toPromptData(sheet);
  assertEquals(data.facilities, ["waiting area"]);
  assertEquals(data.name, "Escola de Música L'Harmonia");
});

Deno.test("keeps empty facilities empty", () => {
  const data = toPromptData({ ...sheet, facilities: [] });
  assertEquals(data.facilities, []);
});

Deno.test("cleans the provider description", () => {
  assertEquals(toPromptData({ ...sheet, description: "   " }).description, null);
  assertEquals(toPromptData({ ...sheet, description: "a".repeat(600) }).description?.length, 500);
});