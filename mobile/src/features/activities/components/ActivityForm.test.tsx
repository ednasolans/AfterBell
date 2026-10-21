import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import { type ActivityForm as ActivityFormValues } from "../types";
import { ActivityForm } from "./ActivityForm";

// The provider has one address. Its loading, error and empty states are
// tested in AddressSelect.test.tsx; here the form only needs the options.
jest.mock("../hooks/useMyAddresses", () => ({
  useMyAddresses: () => ({
    isPending: false,
    isError: false,
    data: [{ id: "address-1", address: "C/ Major 1", city: "Lleida" }],
  }),
}));

const SAVED_ACTIVITY: ActivityFormValues = {
  title: "Swimming for kids",
  description: "Small groups",
  category: "swimming",
  targetAgeRanges: ["7-9"],
  schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
  priceMin: 30,
  priceMax: 40,
  pricePeriod: "per_month",
  maxParticipants: 12,
  addressId: "address-1",
};

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

describe("ActivityForm", () => {
  it("shows every section of the activity", async () => {
    await render(
      <ActivityForm
        submitLabel="Create activity"
        onSubmit={jest.fn()}
        isSaving={false}
        saveFailed={false}
      />,
    );

    expect(screen.getByRole("header", { name: "Details" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Place" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Schedule" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Prices" })).toBeOnTheScreen();
  });

  it("does not submit an empty activity and asks to fix the errors", async () => {
    const onSubmit = jest.fn();
    const onSaved = jest.fn();
    await render(
      <ActivityForm
        submitLabel="Create activity"
        onSubmit={onSubmit}
        isSaving={false}
        saveFailed={false}
        onSaved={onSaved}
      />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Create activity" }),
    );

    expect(
      screen.getByText("Please fix the errors above before saving."),
    ).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("submits the activity filled in by the user", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onSaved = jest.fn();
    await render(
      <ActivityForm
        submitLabel="Create activity"
        onSubmit={onSubmit}
        isSaving={false}
        saveFailed={false}
        onSaved={onSaved}
      />,
    );

    await fireEvent.changeText(
      screen.getByLabelText("Title"),
      "Swimming for kids",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Description"),
      "Small groups",
    );
    await pickFirstOption("Choose a category");
    await tickFirstOption("Choose the age ranges");
    await fireEvent.changeText(
      screen.getByLabelText("Maximum participants"),
      "12",
    );
    await pickFirstOption("Choose where it takes place");
    await pickFirstOption("Choose a day");
    const [startInput, endInput] = screen.getAllByPlaceholderText("HH:MM");
    await fireEvent.changeText(startInput, "17:00");
    await fireEvent.changeText(endInput, "18:00");
    await fireEvent.press(
      screen.getByRole("button", { name: "Add time slot" }),
    );
    const [minPriceInput, maxPriceInput] =
      screen.getAllByPlaceholderText("0,00");
    await fireEvent.changeText(minPriceInput, "30");
    await fireEvent.changeText(maxPriceInput, "40,50");
    await pickFirstOption("Choose a period");

    await fireEvent.press(
      screen.getByRole("button", { name: "Create activity" }),
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Swimming for kids",
        description: "Small groups",
        schedule: [{ day: "monday", startTime: "17:00", endTime: "18:00" }],
        priceMin: 30,
        priceMax: 40.5,
        maxParticipants: 12,
        addressId: "address-1",
      }),
    );
  });

  it("starts with the given values, to edit an activity", async () => {
    await render(
      <ActivityForm
        initialForm={SAVED_ACTIVITY}
        submitLabel="Save changes"
        onSubmit={jest.fn()}
        isSaving={false}
        saveFailed={false}
      />,
    );

    expect(screen.getByDisplayValue("Swimming for kids")).toBeOnTheScreen();
    expect(screen.getByText("Tuesday 17:00–18:00")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("30")).toBeOnTheScreen();
    expect(screen.getByText("C/ Major 1, Lleida")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeOnTheScreen();
  });

  it("does not call onSaved when saving fails, and shows the error", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error("Network error"));
    const onSaved = jest.fn();
    await render(
      <ActivityForm
        initialForm={SAVED_ACTIVITY}
        submitLabel="Save changes"
        onSubmit={onSubmit}
        isSaving={false}
        saveFailed
        onSaved={onSaved}
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
    expect(
      screen.getByText("The activity could not be saved. Please try again."),
    ).toBeOnTheScreen();
  });
});
