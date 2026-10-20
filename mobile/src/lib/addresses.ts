import { isBlank } from "./validation";

// One address of a provider, as typed in a form.
// Shared by the technical sheet (where addresses are entered) and the
// activities (where one of them is chosen).
export interface AddressForm {
  address: string;
  city: string;
}

export const EMPTY_ADDRESS_FORM: AddressForm = { address: "", city: "" };

// An address saved in the addresses table
export interface Address extends AddressForm {
  id: string;
}

export type AddressErrors = Partial<Record<keyof AddressForm, string>>;

// Same limits as the CHECK constraints of the addresses table
export const ADDRESS_MAX_LENGTH = 200;
export const CITY_MAX_LENGTH = 100;

// Both fields are required: an activity needs a real place to take place
export function validateAddress(form: AddressForm): AddressErrors {
  const errors: AddressErrors = {};
  if (isBlank(form.address)) {
    errors.address = "Address is required";
  } else if (form.address.trim().length > ADDRESS_MAX_LENGTH) {
    errors.address = `Address must be at most ${ADDRESS_MAX_LENGTH} characters`;
  }
  if (isBlank(form.city)) {
    errors.city = "City is required";
  } else if (form.city.trim().length > CITY_MAX_LENGTH) {
    errors.city = `City must be at most ${CITY_MAX_LENGTH} characters`;
  }
  return errors;
}

// "C/ Major 1, Lleida"
export function formatAddress({ address, city }: AddressForm): string {
  return `${address}, ${city}`;
}
