
import { supabase } from "@/lib/supabase";
import { hasErrors } from "@/lib/validation";
import { type TutorProfileForm } from "../types";
import {
  TutorValidationError,
  validateTutorProfile,
} from "../validation";

async function currentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("You must be logged in");

  return user.id;
}

export async function fetchMyTutorProfile() {
  const userId = await currentUserId();

  const { data, error } = await supabase
    .from("technical_sheets")
    .select(`
      id,
      first_name,
      last_name,
      description,
      addresses!technical_sheets_address_fkey (
        street,
        number,
        floor,
        door,
        postal_code,
        city,
        province,
        country
      )
    `)
    .eq("provider_id", userId)
    .eq("provider_type", "private_tutor")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

export async function updateMyTutorProfile(
  values: TutorProfileForm,
): Promise<void> {
  const errors = validateTutorProfile(values);

  if (hasErrors(errors)) {
    throw new TutorValidationError(errors);
  }

  const { error } = await supabase.rpc(
    "update_my_tutor_profile",
    {
      p_first_name: values.firstName.trim(),
      p_last_name: values.lastName.trim(),
      p_presentation: values.presentation.trim(),
      p_street: values.street.trim(),
      p_number: values.number.trim(),
      p_floor: values.floor.trim(),
      p_door: values.door.trim(),
      p_postal_code: values.postalCode.trim(),
      p_city: values.city.trim(),
      p_province: values.province.trim(),
      p_country: values.country.trim(),
    },
  );

  if (error) throw error;
}
