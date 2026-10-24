import { assertEquals } from "jsr:@std/assert@1";
import { toPromptData } from "../_shared/labels.ts";


const sheet = {
  name: "  Escola de Música L'Harmonia ",
  provider_type: "music_school",
  activity_types: ["music"],
  facilities: ["waiting_area", "not_a_real_code"],
  city: "Lleida",
};

Deno.test("translates codes into Catalan labels", () => {
  const data = toPromptData(sheet);
  assertEquals(data.type, "escola de música");
  assertEquals(data.activities, ["música"]);
});

Deno.test("drops unknown codes and trims text", () => {
  const data = toPromptData(sheet);
  assertEquals(data.facilities, ["sala d'espera"]);
  assertEquals(data.name, "Escola de Música L'Harmonia");
});

Deno.test("keeps empty facilities empty", () => {
  const data = toPromptData({ ...sheet, facilities: [] });
  assertEquals(data.facilities, []);
});