import { toAddressInsert } from "@/lib/addresses";

import { supabase } from "../../../lib/supabase";
import { type TechnicalSheetForm } from "../types";
import { toTechnicalSheetInsert } from "./toTechnicalSheetInsert";

// Saves the addresses first and then the sheet, which points to the main one.
// Supabase cannot do both in one transaction from the app, so if the sheet
// fails, the new addresses are deleted to avoid leaving them without a sheet.
export async function saveTechnicalSheet(
  sheet: TechnicalSheetForm,
): Promise<void> {
  const [mainAddress, ...otherAddresses] = sheet.addresses;

  // The main address is inserted on its own to know its id for sure:
  // the order of the rows returned by a multiple insert is not guaranteed.
  const { data: main, error: mainError } = await supabase
    .from("addresses")
    .insert(toAddressInsert(mainAddress))
    .select("id")
    .single();
  if (mainError) {
    throw new Error(mainError.message);
  }
  const savedIds = [main.id];

  if (otherAddresses.length > 0) {
    const { data: others, error: othersError } = await supabase
      .from("addresses")
      .insert(otherAddresses.map(toAddressInsert))
      .select("id");
    if (othersError) {
      await deleteAddresses(savedIds);
      throw new Error(othersError.message);
    }
    savedIds.push(...others.map((address) => address.id));
  }

  const { error } = await supabase
    .from("technical_sheets")
    .insert(toTechnicalSheetInsert(sheet, main.id));
  if (error) {
    await deleteAddresses(savedIds);
    throw new Error(error.message);
  }
}

// Best effort: if this also fails, the original error is the one reported
async function deleteAddresses(ids: string[]): Promise<void> {
  await supabase.from("addresses").delete().in("id", ids);
}
