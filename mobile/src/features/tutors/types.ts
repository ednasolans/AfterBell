
import { type Tables } from "@/lib/database.types";

export interface TutorRegistration {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  presentation: string;
  street: string;
  number: string;
  floor: string;
  door: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
}

export type TutorProfileForm = Omit<
  TutorRegistration,
  "email" | "password"
>;

export type TutorTechnicalSheet = Tables<"technical_sheets">;
export type TutorAddress = Tables<"addresses">;

export const EMPTY_TUTOR_PROFILE: TutorProfileForm = {
  firstName: "",
  lastName: "",
  presentation: "",
  street: "",
  number: "",
  floor: "",
  door: "",
  postalCode: "",
  city: "",
  province: "",
  country: "Spain",
};
