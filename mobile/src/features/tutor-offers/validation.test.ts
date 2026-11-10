
import {
  validateTutorOffer,
  validateTutorOfferDraft,
} from "./validation";
import { type TutorOfferForm } from "./types";

const completeOffer: TutorOfferForm = {
  technicalSheetId: "sheet-123",
  title: "Mathematics lessons",
  description: "Private tutoring lessons.",
  subjectCodes: ["mathematics"],
  levelCodes: ["secondary"],
  pricePerHour: 20,
};

describe("Tutor offer validation", () => {
  it("accepts a complete offer", () => {
    expect(validateTutorOffer(completeOffer)).toEqual([]);
  });

  it("lists all missing publication fields", () => {
    expect(
      validateTutorOffer({
        ...completeOffer,
        title: "",
        subjectCodes: [],
        levelCodes: [],
        pricePerHour: null,
      }),
    ).toEqual([
      "title",
      "subjects",
      "levels",
      "price",
    ]);
  });

  it("allows an incomplete draft", () => {
    expect(
      validateTutorOfferDraft({
        ...completeOffer,
        title: "",
        subjectCodes: [],
        levelCodes: [],
        pricePerHour: null,
      }),
    ).toEqual([]);
  });

  it("rejects negative prices", () => {
    expect(
      validateTutorOffer({
        ...completeOffer,
        pricePerHour: -5,
      }),
    ).toContain("price");
  });

  it("rejects an overlong title", () => {
    expect(
      validateTutorOfferDraft({
        ...completeOffer,
        title: "a".repeat(121),
      }),
    ).toContain("Title cannot exceed 120 characters.");
  });

  it("requires a technical sheet for drafts", () => {
    expect(
      validateTutorOfferDraft({
        ...completeOffer,
        technicalSheetId: "",
      }),
    ).toContain("A tutor technical sheet is required.");
  });
});
