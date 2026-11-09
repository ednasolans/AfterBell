
import { supabase } from "@/lib/supabase";
import { hasErrors } from "@/lib/validation";
import { type TutorRegistration } from "../types";
import {
  TutorValidationError,
  validateTutorRegistration,
} from "../validation";

export async function registerTutor(
  values: TutorRegistration,
) {
  const errors = validateTutorRegistration(values);

  if (hasErrors(errors)) {
    throw new TutorValidationError(errors);
  }

  const { data, error } = await supabase.auth.signUp({
    email: values.email.trim(),
    password: values.password,
    options: {
      data: {
        account_type: "tutor",
        first_name: values.firstName.trim(),
        last_name: values.lastName.trim(),
        presentation: values.presentation.trim(),
        street: values.street.trim(),
        number: values.number.trim(),
        floor: values.floor.trim() || null,
        door: values.door.trim() || null,
        postal_code: values.postalCode.trim(),
        city: values.city.trim(),
        province: values.province.trim(),
        country: values.country.trim(),
      },
    },
  });

  if (error) throw error;
  return data;
}
