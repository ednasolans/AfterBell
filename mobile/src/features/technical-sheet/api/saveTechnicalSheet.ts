import { addressSearchText, toAddressInsert } from "@/lib/addresses";
import { type Coordinates, findCoordinates } from "@/lib/location";

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
  const [mainPoint, ...otherPoints] = await locateAddresses(sheet.addresses);

  // The main address is inserted on its own to know its id for sure:
  // the order of the rows returned by a multiple insert is not guaranteed.
  const { data: main, error: mainError } = await supabase
    .from("addresses")
    .insert(toAddressInsert(mainAddress, mainPoint))
    .select("id")
    .single();
  if (mainError) {
    throw new Error(mainError.message);
  }
  const savedIds = [main.id];

  if (otherAddresses.length > 0) {
    const { data: others, error: othersError } = await supabase
      .from("addresses")
      .insert(
        otherAddresses.map((address, index) =>
          toAddressInsert(address, otherPoints[index]),
        ),
      )
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

// The point of each address, for recommendations by distance. One after the
// other, so the location permission is asked only once. An address that
// cannot be found is saved without a point: it never blocks saving the sheet.
async function locateAddresses(
  addresses: TechnicalSheetForm["addresses"],
): Promise<(Coordinates | null)[]> {
  const points: (Coordinates | null)[] = [];
  for (const address of addresses) {
    points.push(await findCoordinates(addressSearchText(address)));
  }
  return points;
}

// Best effort: if this also fails, the original error is the one reported
async function deleteAddresses(ids: string[]): Promise<void> {
  await supabase.from("addresses").delete().in("id", ids);
}
