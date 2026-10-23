import { assert, assertEquals } from "jsr:@std/assert@1";
import { buildMessages } from "../_shared/prompts.ts";

const sheet = {
  name: "Escola de Música L'Harmonia",
  provider_type: "music_school",
  activity_types: ["music"],
  facilities: ["wifi"],
  city: "Lleida",
};

Deno.test("builds a system and a user message", () => {
  const messages = buildMessages(sheet);
  assertEquals(messages.length, 2);
  assertEquals(messages[0].role, "system");
  assertEquals(messages[1].role, "user");
});

Deno.test("user message contains translated data", () => {
  const user = buildMessages(sheet)[1].content;
  assert(user.includes("escola de música"));
  assert(user.includes("Lleida"));
  assert(!user.includes("music_school"));
});