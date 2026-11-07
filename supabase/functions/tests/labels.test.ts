import { assertEquals } from "jsr:@std/assert@1";
import { TEMPORARY_ACTIVITIES_MAX, toPromptData } from "../_shared/labels.ts";

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

const camp = { title: " Summer camp ", start_date: "2027-07-01", end_date: "2027-07-15" };

Deno.test("sends the title and dates of temporary activities", () => {
  const data = toPromptData({ ...sheet, temporary_activities: [camp] });
  assertEquals(data.temporary_activities, [
    { title: "Summer camp", start_date: "2027-07-01", end_date: "2027-07-15" },
  ]);
});

Deno.test("leaves the field out without temporary activities", () => {
  assertEquals("temporary_activities" in toPromptData(sheet), false);
  assertEquals(
    "temporary_activities" in toPromptData({ ...sheet, temporary_activities: [] }),
    false,
  );
});

Deno.test("drops activities with missing or wrong dates", () => {
  const data = toPromptData({
    ...sheet,
    temporary_activities: [
      { ...camp, start_date: null },
      { ...camp, end_date: null },
      { ...camp, end_date: "soon" },
      { ...camp, title: "   " },
    ],
  });
  assertEquals("temporary_activities" in data, false);
});

Deno.test("keeps the complete activities when another one is incomplete", () => {
  const data = toPromptData({
    ...sheet,
    temporary_activities: [{ ...camp, start_date: null }, camp],
  });
  assertEquals(data.temporary_activities?.length, 1);
});

Deno.test("sends at most the maximum number of activities", () => {
  const data = toPromptData({
    ...sheet,
    temporary_activities: Array(TEMPORARY_ACTIVITIES_MAX + 1).fill(camp),
  });
  assertEquals(data.temporary_activities?.length, TEMPORARY_ACTIVITIES_MAX);
});
