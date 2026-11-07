import { assert, assertEquals } from "jsr:@std/assert@1";
import { buildMessages } from "../_shared/prompts.ts";

const sheet = {
  name: "Escola de Música L'Harmonia",
  provider_type: "music_school",
  description: null,
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
  assert(user.includes("music school"));
  assert(user.includes("Lleida"));
  assert(!user.includes("music_school"));
});

Deno.test("a temporary activity sends its dates and asks to mention them", () => {
  const [system, user] = buildMessages({
    ...sheet,
    temporary_activities: [
      { title: "Summer camp", start_date: "2027-07-01", end_date: "2027-07-15" },
    ],
  });
  assert(system.content.includes("mention each one with its title and its start and end dates"));
  assert(user.content.includes("Summer camp"));
  assert(user.content.includes("2027-07-01"));
  assert(user.content.includes("2027-07-15"));
});

Deno.test("a provider with only whole-year activities sends no dates", () => {
  const [system, user] = buildMessages(sheet);
  assert(system.content.includes("Never mention or invent dates"));
  assert(!user.content.includes("temporary_activities"));
});

Deno.test("incomplete dates do not reach the prompt", () => {
  const user = buildMessages({
    ...sheet,
    temporary_activities: [{ title: "Summer camp", start_date: "2027-07-01", end_date: null }],
  })[1].content;
  assert(!user.includes("Summer camp"));
});
