import {
  DESCRIPTION_MAX_LENGTH,
  HEADLINE_MAX_LENGTH,
  validateProfileForm,
} from "./validation";
import { type ProfileForm } from "./types";

const VALID: ProfileForm = {
  headline: "Music lessons in Lleida",
  description: "A music school offering piano and guitar classes.",
};

describe("validateProfileForm", () => {
  it("accepts a valid form", () => {
    expect(validateProfileForm(VALID)).toEqual({});
  });

  it("requires a headline", () => {
    expect(validateProfileForm({ ...VALID, headline: "   " })).toEqual({
      headline: "Headline is required.",
    });
  });

  it("requires a description", () => {
    expect(validateProfileForm({ ...VALID, description: "" })).toEqual({
      description: "Description is required.",
    });
  });

  it("accepts a headline exactly at the limit", () => {
    const headline = "a".repeat(HEADLINE_MAX_LENGTH);
    expect(validateProfileForm({ ...VALID, headline })).toEqual({});
  });

  it("rejects a headline one character over the limit", () => {
    const headline = "a".repeat(HEADLINE_MAX_LENGTH + 1);
    expect(validateProfileForm({ ...VALID, headline }).headline).toBe(
      `Headline must have at most ${HEADLINE_MAX_LENGTH} characters.`,
    );
  });

  it("accepts a description exactly at the limit", () => {
    const description = "a".repeat(DESCRIPTION_MAX_LENGTH);
    expect(validateProfileForm({ ...VALID, description })).toEqual({});
  });

  it("rejects a description one character over the limit", () => {
    const description = "a".repeat(DESCRIPTION_MAX_LENGTH + 1);
    expect(validateProfileForm({ ...VALID, description }).description).toBe(
      `Description must have at most ${DESCRIPTION_MAX_LENGTH} characters.`,
    );
  });

  it("does not count surrounding spaces in the length", () => {
    const headline = ` ${"a".repeat(HEADLINE_MAX_LENGTH)} `;
    expect(validateProfileForm({ ...VALID, headline })).toEqual({});
  });

  it("does not change the form it receives", () => {
    const form = { ...VALID, headline: "" };
    validateProfileForm(form);
    expect(form).toEqual({ ...VALID, headline: "" });
  });
});
