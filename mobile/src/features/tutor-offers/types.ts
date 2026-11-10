
export type TutorOfferStatus = "draft" | "published";

export interface TutorCatalogItem {
  code: string;
  name: string;
}

export interface TutorOfferForm {
  technicalSheetId: string;
  title: string;
  description: string;
  subjectCodes: string[];
  levelCodes: string[];
  pricePerHour: number | null;
}

export interface TutorOffer {
  id: string;
  tutorId: string;
  technicalSheetId: string;
  title: string | null;
  description: string | null;
  subjectCodes: string[];
  levelCodes: string[];
  pricePerHour: number | null;
  category: "tutoring";
  status: TutorOfferStatus;
  createdAt: string;
  updatedAt: string;
}

export const TUTOR_OFFER_ISSUES = [
  "technical_sheet",
  "address",
  "title",
  "subjects",
  "levels",
  "price",
] as const;

export type TutorOfferIssue =
  (typeof TUTOR_OFFER_ISSUES)[number];

export const TUTOR_OFFER_ISSUE_LABELS:
  Record<TutorOfferIssue, string> = {
    technical_sheet:
      "Complete your tutor technical sheet.",
    address:
      "Complete your address, including street and number.",
    title:
      "Add an offer title.",
    subjects:
      "Select at least one subject.",
    levels:
      "Select at least one education level.",
    price:
      "Add the hourly price.",
  };
