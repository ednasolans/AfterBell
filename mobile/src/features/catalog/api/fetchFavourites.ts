import { supabase } from "@/lib/supabase";

import { type FavouriteActivity } from "../types";
import { toFavouriteActivity } from "./toFavouriteActivity";

// The most the function returns in one page
const FAVOURITES_PAGE_SIZE = 100;

// The favourites of the logged-in customer, newest first, including the ones
// that are no longer available
export async function fetchFavourites(): Promise<FavouriteActivity[]> {
  const { data, error } = await supabase.rpc("my_favourites", {
    p_limit: FAVOURITES_PAGE_SIZE,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data.map(toFavouriteActivity);
}
