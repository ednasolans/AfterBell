import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

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

beforeEach(() => {
  mockedSave.mockReset();
});

describe("TechnicalSheetForm", () => {
  it("shows every section of the sheet", async () => {
    await render(<TechnicalSheetForm />);

    expect(
      screen.getByRole("header", { name: "Basic information" }),
    ).toBeOnTheScreen();
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
    await fireEvent.changeText(screen.getByLabelText("City"), "Lleida");
    await fireEvent.changeText(
      screen.getByLabelText("Address"),
      "Carrer Major 1",
    );
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
        city: "Lleida",
        address: "Carrer Major 1",
        phoneNumber: "973 000 000",
        email: "info@club.cat",
        website: "https://club.cat",
      }),
    );
  });
});
