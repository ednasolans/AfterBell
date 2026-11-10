
import { supabase } from "@/lib/supabase";

import {
  type TutorOffer,
  type TutorOfferForm,
  type TutorOfferIssue,
  type TutorOfferStatus,
} from "../types";
import {
  validateTutorOfferDraft,
} from "../validation";

type TutorOfferRow = {
  id: string;
  tutor_id: string;
  technical_sheet_id: string;
  title: string | null;
  description: string | null;
  subject_codes: string[];
  level_codes: string[];
  price_per_hour: number | null;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function toTutorOffer(row: TutorOfferRow): TutorOffer {
  return {
    id: row.id,
    tutorId: row.tutor_id,
    technicalSheetId: row.technical_sheet_id,
    title: row.title,
    description: row.description,
    subjectCodes: row.subject_codes,
    levelCodes: row.level_codes,
    pricePerHour: row.price_per_hour,
    category: "tutoring",
    status: row.status as TutorOfferStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("Authentication required");
  }

  return data.user.id;
}

function checkDraft(form: TutorOfferForm): void {
  const errors = validateTutorOfferDraft(form);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}

// CREATE: saves an offer as a draft.
export async function createTutorOffer(
  form: TutorOfferForm,
): Promise<TutorOffer> {
  checkDraft(form);
  const tutorId = await requireUserId();

  const { data, error } = await supabase
    .from("tutor_offers")
    .insert({
      tutor_id: tutorId,
      technical_sheet_id: form.technicalSheetId,
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      subject_codes: form.subjectCodes,
      level_codes: form.levelCodes,
      price_per_hour: form.pricePerHour,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return toTutorOffer(data);
}

// READ: lists the authenticated tutor's own offers.
export async function fetchMyTutorOffers():
  Promise<TutorOffer[]> {
  const tutorId = await requireUserId();

  const { data, error } = await supabase
    .from("tutor_offers")
    .select("*")
    .eq("tutor_id", tutorId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toTutorOffer);
}

// READ: one offer belonging to the authenticated tutor.
export async function fetchMyTutorOffer(
  id: string,
): Promise<TutorOffer | null> {
  const tutorId = await requireUserId();

  const { data, error } = await supabase
    .from("tutor_offers")
    .select("*")
    .eq("id", id)
    .eq("tutor_id", tutorId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toTutorOffer(data) : null;
}

// UPDATE: edits the offer while keeping the same owner,
// technical sheet and category.
export async function updateTutorOffer(
  id: string,
  form: TutorOfferForm,
): Promise<TutorOffer> {
  checkDraft(form);
  const tutorId = await requireUserId();

  const { data, error } = await supabase
    .from("tutor_offers")
    .update({
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      subject_codes: form.subjectCodes,
      level_codes: form.levelCodes,
      price_per_hour: form.pricePerHour,
    })
    .eq("id", id)
    .eq("tutor_id", tutorId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    throw new Error("Offer not found or not owned by you");
  }

  return toTutorOffer(data);
}

// DELETE: permanently deletes an owned offer.
export async function deleteTutorOffer(
  id: string,
): Promise<void> {
  const tutorId = await requireUserId();

  const { data, error } = await supabase
    .from("tutor_offers")
    .delete()
    .eq("id", id)
    .eq("tutor_id", tutorId)
    .select("id");

  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    throw new Error("Offer not found or not owned by you");
  }
}

// Lists every missing publication requirement.
// The database returns null for another owner's offer.
export async function fetchTutorOfferPublicationIssues(
  id: string,
): Promise<TutorOfferIssue[]> {
  const { data, error } = await supabase.rpc(
    "tutor_offer_publication_issues",
    { p_offer_id: id },
  );

  if (error) throw new Error(error.message);

  if (data === null) {
    throw new Error("Offer not found or not owned by you");
  }

  return data as TutorOfferIssue[];
}

export class TutorOfferPublicationError extends Error {
  constructor(public readonly issues: TutorOfferIssue[]) {
    super(
      "Missing fields: " + issues.join(", "),
    );
    this.name = "TutorOfferPublicationError";
  }
}

// PUBLISH: refuses incomplete offers.
export async function publishTutorOffer(
  id: string,
): Promise<TutorOffer> {
  const issues =
    await fetchTutorOfferPublicationIssues(id);

  if (issues.length > 0) {
    throw new TutorOfferPublicationError(issues);
  }

  return changeTutorOfferStatus(id, "published");
}

// UNPUBLISH: returns an offer to draft.
export async function unpublishTutorOffer(
  id: string,
): Promise<TutorOffer> {
  return changeTutorOfferStatus(id, "draft");
}

async function changeTutorOfferStatus(
  id: string,
  status: TutorOfferStatus,
): Promise<TutorOffer> {
  const tutorId = await requireUserId();

  const { data, error } = await supabase
    .from("tutor_offers")
    .update({ status })
    .eq("id", id)
    .eq("tutor_id", tutorId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    throw new Error("Offer not found or not owned by you");
  }

  return toTutorOffer(data);
}

// CUSTOMER-FACING ENDPOINTS
// Explicit status filters, in addition to database RLS.

export async function fetchPublishedTutorOffers():
  Promise<TutorOffer[]> {
  const { data, error } = await supabase
    .from("tutor_offers")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toTutorOffer);
}

export async function fetchPublishedTutorOffer(
  id: string,
): Promise<TutorOffer | null> {
  const { data, error } = await supabase
    .from("tutor_offers")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toTutorOffer(data) : null;
}
