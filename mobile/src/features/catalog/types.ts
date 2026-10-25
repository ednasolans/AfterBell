import { type Activity } from "@/features/activities/types";

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
}

// The detail screen also shows where the activity takes place
export interface CatalogActivityDetail extends CatalogActivity {
  address: string | null;
}