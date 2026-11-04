import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import { type AddressForm } from "@/lib/addresses";
import { MAIN_ADDRESS, SECOND_ADDRESS } from "@/test-utils/addressFixtures";

import { saveTechnicalSheet } from "../api/saveTechnicalSheet";
import { TechnicalSheetForm } from "./TechnicalSheetForm";

// Never reach Supabase from a component test
jest.mock("../api/saveTechnicalSheet", () => ({
  saveTechnicalSheet: jest.fn(),
}));

const mockedSave = jest.mocked(saveTechnicalSheet);

// Opens a Select and picks its first option
async function pickFirstOption(placeholder: string) {
  await fireEvent.press(screen.getByText(placeholder));
  await fireEvent.press(screen.getAllByRole("radio")[0]);
}

// Opens a MultiSelect, ticks its first option and closes it
async function tickFirstOption(placeholder: string) {
  await fireEvent.press(screen.getByText(placeholder));
  await fireEvent.press(screen.getAllByRole("checkbox")[0]);
  await fireEvent.press(screen.getByRole("button", { name: "Done" }));
}

// Types the fields of one address (the number of the address in the form)
async function fillAddress(position: number, address: AddressForm) {
  const fields = [
    ["Street", address.street],
    ["Number", address.number],
    ["Floor", address.floor],
    ["Door", address.door],
    ["Postal code", address.postalCode],
    ["City", address.city],
    ["Province", address.province],
    ["Country", address.country],
  ];
  for (const [label, value] of fields) {
    await fireEvent.changeText(
      screen.getByLabelText(`${label} ${position}`),
      value,
    );
  }
}

beforeEach(() => {
  mockedSave.mockReset();
});

describe("TechnicalSheetForm", () => {
  it("shows every section of the sheet", async () => {
    await render(<TechnicalSheetForm />);

    expect(
      screen.getByRole("header", { name: "Basic information" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Addresses" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Contact" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Activity" })).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Facilities" }),
    ).toBeOnTheScreen();
  });

  it("does not save an empty sheet and asks to fix the errors", async () => {
    const onSaved = jest.fn();
    await render(<TechnicalSheetForm onSaved={onSaved} />);

    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText("Please fix the errors above before saving."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Street is required")).toBeOnTheScreen();
    expect(mockedSave).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("saves the sheet filled in by the user", async () => {
    mockedSave.mockResolvedValue(undefined);
    const onSaved = jest.fn();
    await render(<TechnicalSheetForm onSaved={onSaved} />);

    // Basic information
    await fireEvent.changeText(
      screen.getByLabelText("Name"),
      "Lleida Swimming Club",
    );
    await pickFirstOption("Select provider type");
    await fireEvent.changeText(
      screen.getByLabelText("Description"),
      "Swimming lessons for every age",
    );

    // Addresses: the main one and a second one
    await fillAddress(1, MAIN_ADDRESS);
    await fireEvent.press(
      screen.getByRole("button", { name: "Add another address" }),
    );
    await fillAddress(2, SECOND_ADDRESS);

    // Contact
    await fireEvent.changeText(
      screen.getByLabelText("Phone number"),
      "973 000 000",
    );
    await fireEvent.changeText(screen.getByLabelText("Email"), "info@club.cat");
    await fireEvent.changeText(
      screen.getByLabelText("Website"),
      "https://club.cat",
    );

    // Activity
    await tickFirstOption("Select activity");

    // Facilities
    await tickFirstOption("Choose the facilities you offer");

    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mockedSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Lleida Swimming Club",
        description: "Swimming lessons for every age",
        addresses: [MAIN_ADDRESS, SECOND_ADDRESS],
        phoneNumber: "973 000 000",
        email: "info@club.cat",
        website: "https://club.cat",
      }),
    );
  });
});
