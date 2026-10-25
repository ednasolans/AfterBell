
import { supabase } from "@/lib/supabase";
import type {
  FamilyProfile,
  FamilyProfileFormValues,
} from "../types";

export async function getFamilyGroupId(): Promise<string> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("You must be logged in");

  const { data, error } = await supabase
    .from("family_group_members")
    .select("family_group_id")
    .eq("account_id", user.id)
    .single();

  if (error) throw error;

  return data.family_group_id;
}

export async function fetchFamilyProfiles(): Promise<FamilyProfile[]> {
  const groupId = await getFamilyGroupId();

  const { data, error } = await supabase
    .from("family_profiles")
    .select("*")
    .eq("family_group_id", groupId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function fetchFamilyProfile(
  id: string,
): Promise<FamilyProfile> {
  const groupId = await getFamilyGroupId();

  const { data, error } = await supabase
    .from("family_profiles")
    .select("*")
    .eq("id", id)
    .eq("family_group_id", groupId)
    .single();

  if (error) throw error;

  return data;
}

export async function createFamilyProfile(
  values: FamilyProfileFormValues,
): Promise<FamilyProfile> {
  const groupId = await getFamilyGroupId();

  if (!values.ageRange) {
    throw new Error("Age range is required");
  }

  const { data, error } = await supabase
    .from("family_profiles")
    .insert({
      family_group_id: groupId,
      first_name: values.firstName.trim(),
      age_range: values.ageRange,
      interests: values.interests,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateFamilyProfile(
  id: string,
  values: FamilyProfileFormValues,
): Promise<FamilyProfile> {
  const groupId = await getFamilyGroupId();

  if (!values.ageRange) {
    throw new Error("Age range is required");
  }

  const { data, error } = await supabase
    .from("family_profiles")
    .update({
      first_name: values.firstName.trim(),
      age_range: values.ageRange,
      interests: values.interests,
    })
    .eq("id", id)
    .eq("family_group_id", groupId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteFamilyProfile(id: string): Promise<void> {
  const groupId = await getFamilyGroupId();

  const { error } = await supabase
    .from("family_profiles")
    .delete()
    .eq("id", id)
    .eq("family_group_id", groupId)
    .select("id")
    .single();

  if (error) {
    throw error;
  }
}
