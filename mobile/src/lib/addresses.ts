import { emptyToNull } from "./text";
import { type Tables, type TablesInsert } from "./database.types";
import { isBlank } from "./validation";

// One address of a provider, as typed in a form.
// Shared by the technical sheet (where addresses are entered) and the
// activities (where one of them is chosen).
export interface AddressForm {
  street: string;
  number: string;
  floor: string;
  door: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
}

export const EMPTY_ADDRESS_FORM: AddressForm = {
  street: "",
  number: "",
  floor: "",
  door: "",
  postalCode: "",
  city: "",
  province: "",
  country: "Spain",
};

// A saved address, as the app shows it
export interface Address {
  id: string;
  address: string;
  city: string;
}

// The columns needed to read an address
export type AddressRow = Pick<
  Tables<"addresses">,
  "id" | "address" | "street" | "number" | "city"
>;

// Older rows keep their text in `address`; new rows only have street and number.
export function toAddress(row: AddressRow): Address {
  return {
    id: row.id,
    address: row.address ?? [row.street, row.number].filter(Boolean).join(" "),
    city: row.city,
  };
}

export type AddressErrors = Partial<Record<keyof AddressForm, string>>;

// Same limits as the CHECK constraints of the addresses table
export const STREET_MAX_LENGTH = 200;
export const CITY_MAX_LENGTH = 100;
export const PROVINCE_MAX_LENGTH = 100;
export const COUNTRY_MAX_LENGTH = 100;
export const SHORT_FIELD_MAX_LENGTH = 20;

type AddressRule = {
  field: keyof AddressForm;
  label: string;
  maxLength: number;
  required: boolean;
};

// The database needs all of them to publish an activity at this address,
// except the floor and the door
const ADDRESS_RULES: AddressRule[] = [
  {
    field: "street",
    label: "Street",
    maxLength: STREET_MAX_LENGTH,
    required: true,
  },
  {
    field: "number",
    label: "Number",
    maxLength: SHORT_FIELD_MAX_LENGTH,
    required: true,
  },
  {
    field: "floor",
    label: "Floor",
    maxLength: SHORT_FIELD_MAX_LENGTH,
    required: false,
  },
  {
    field: "door",
    label: "Door",
    maxLength: SHORT_FIELD_MAX_LENGTH,
    required: false,
  },
  {
    field: "postalCode",
    label: "Postal code",
    maxLength: SHORT_FIELD_MAX_LENGTH,
    required: true,
  },
  { field: "city", label: "City", maxLength: CITY_MAX_LENGTH, required: true },
  {
    field: "province",
    label: "Province",
    maxLength: PROVINCE_MAX_LENGTH,
    required: true,
  },
  {
    field: "country",
    label: "Country",
    maxLength: COUNTRY_MAX_LENGTH,
    required: true,
  },
];

export function validateAddress(form: AddressForm): AddressErrors {
  const errors: AddressErrors = {};
  for (const { field, label, maxLength, required } of ADDRESS_RULES) {
    if (required && isBlank(form[field])) {
      errors[field] = `${label} is required`;
    } else if (form[field].trim().length > maxLength) {
      errors[field] = `${label} must be at most ${maxLength} characters`;
    }
  }
  return errors;
}

// "C/ Major 1, Lleida"
export function formatAddress({
  address,
  city,
}: Pick<Address, "address" | "city">): string {
  return `${address}, ${city}`;
}

// Converts a validated address into a database row, without surrounding spaces.
// provider_id is not sent: the database fills it with the logged-in user.
export function toAddressInsert(form: AddressForm): TablesInsert<"addresses"> {
  return {
    street: form.street.trim(),
    number: form.number.trim(),
    floor: emptyToNull(form.floor),
    door: emptyToNull(form.door),
    postal_code: form.postalCode.trim(),
    city: form.city.trim(),
    province: form.province.trim(),
    country: form.country.trim(),
  };
}
