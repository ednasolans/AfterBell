import { type Activity } from "@/lib/activity";

// Name and contact details of a provider, taken from its technical sheet
export interface ProviderContact {
  name: string;
  email: string | null;
  phoneNumber: string | null;
  website: string | null;
}

// A provider as customers see it: its approved profile, plus its contact
// details when it has a technical sheet
export interface CatalogProvider {
  id: string;
  headline: string;
  description: string;
  contact: ProviderContact | null;
}

// An activity as customers see it in the catalog. It only exists there
// when its provider has an approved profile.
export interface CatalogActivity {
  activity: Activity;
  provider: CatalogProvider;
  // Saved in the favourites of the logged-in customer
  isFavourite: boolean;
}

// The detail screen also shows where the activity takes place and how many
// people are enrolled
export interface CatalogActivityDetail extends CatalogActivity {
  address: string | null;
  // Null when it cannot be read
  enrolledCount: number | null;
}

// What the activity card shows. The favourites list only has these fields,
// because customers cannot read activities that are no longer published.
export type CatalogCardActivity = Pick<
  Activity,
  | "id"
  | "title"
  | "category"
  | "type"
  | "startDate"
  | "endDate"
  | "targetAgeRanges"
  | "price"
  | "pricePeriod"
>;

// An activity saved by the customer. It stays in the list when it is no
// longer published or has finished, marked as not available.
export interface FavouriteActivity {
  activity: CatalogCardActivity;
  providerName: string | null;
  // Published, not finished and with an approved provider: it can be opened
  available: boolean;
  savedAt: string;
}
