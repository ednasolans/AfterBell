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
  minAge: 7,
  maxAge: 12,
  schedule: ["Tuesday 17:00-18:00"],
  price: 30,
  startDate: "2026-10-01",
  endDate: "",
  addressId: "address-1",
  status: "draft",
};

// Opens a Select and picks its first option
async function pickFirstOption(placeholder: string) {
  await fireEvent.press(screen.getByText(placeholder));
  await fireEvent.press(screen.getAllByRole("radio")[0]);
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
    expect(screen.getByRole("header", { name: "Price" })).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Visibility" }),
    ).toBeOnTheScreen();
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
    await fireEvent.changeText(screen.getByLabelText("Minimum age"), "7");
    await fireEvent.changeText(screen.getByLabelText("Maximum age"), "12");
    await pickFirstOption("Choose where it takes place");
    await fireEvent.changeText(
      screen.getByLabelText("Time slots (one per line)"),
      "Tuesday 17:00-18:00",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Start date (YYYY-MM-DD)"),
      "2026-10-01",
    );
    await fireEvent.changeText(
      screen.getByLabelText("End date (YYYY-MM-DD)"),
      "2026-12-31",
    );
    await fireEvent.changeText(screen.getByLabelText("Price (€)"), "30");
    // The status starts as a draft: publish it
    await fireEvent.press(screen.getByText("Draft (only you can see it)"));
    await fireEvent.press(screen.getAllByRole("radio")[1]);

    await fireEvent.press(
      screen.getByRole("button", { name: "Create activity" }),
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Swimming for kids",
        description: "Small groups",
        minAge: 7,
        maxAge: 12,
        schedule: ["Tuesday 17:00-18:00"],
        price: 30,
        startDate: "2026-10-01",
        endDate: "2026-12-31",
        addressId: "address-1",
        status: "published",
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
    expect(screen.getByDisplayValue("Tuesday 17:00-18:00")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("30")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("2026-10-01")).toBeOnTheScreen();
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