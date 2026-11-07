import { fireEvent, render, screen } from "@testing-library/react-native";

import { formatDate } from "@/lib/dates";

import {
  EMPTY_ACTIVITY_FORM,
  type ActivityForm as ActivityFormValues,
} from "../types";
import { ActivityForm } from "./ActivityForm";

jest.mock("./AddressSelect", () => ({
  AddressSelect: () => null,
}));

const TEMPORARY_FORM: ActivityFormValues = {
  ...EMPTY_ACTIVITY_FORM,
  title: "Summer camp",
  category: "swimming",
  type: "temporary",
  startDate: "2099-07-01",
  endDate: "2099-07-15",
  targetAgeRanges: ["7-9"],
  schedule: [{ day: "monday", startTime: "10:00", endTime: "12:00" }],
  price: 10,
  pricePeriod: "per_week",
  maxParticipants: 10,
  addressId: "address-1",
};

describe("ActivityForm", () => {
  it("shows the fields for the current activity schema", async () => {
    await render(
      <ActivityForm
        initialForm={EMPTY_ACTIVITY_FORM}
        submitLabel="Save"
        onSubmit={jest.fn()}
        isSaving={false}
        saveError={null}
      />,
    );

    expect(screen.getByLabelText("Title")).toBeOnTheScreen();
    expect(screen.getByText("Age ranges")).toBeOnTheScreen();
    expect(screen.getByText("Price period")).toBeOnTheScreen();
    expect(screen.getByText("Maximum participants")).toBeOnTheScreen();
  });

  it("submits a valid activity", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(
      <ActivityForm
        initialForm={{
          ...EMPTY_ACTIVITY_FORM,
          title: "Swimming",
          category: "swimming",
          targetAgeRanges: ["7-9"],
          schedule: [{ day: "tuesday", startTime: "17:00", endTime: "18:00" }],
          price: 10,
          pricePeriod: "per_month",
          maxParticipants: 10,
          addressId: "address-1",
        }}
        submitLabel="Save"
        onSubmit={onSubmit}
        isSaving={false}
        saveError={null}
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalled();
  });
  it("lets the provider choose the activity type", async () => {
    await render(
      <ActivityForm
        initialForm={EMPTY_ACTIVITY_FORM}
        submitLabel="Save"
        onSubmit={jest.fn()}
        isSaving={false}
        saveError={null}
      />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Activity type: Whole year" }),
    );
    await fireEvent.press(screen.getByRole("radio", { name: /Temporary/ }));

    expect(
      screen.getByRole("button", { name: "Activity type: Temporary" }),
    ).toBeOnTheScreen();
  });

  it("shows the dates only for a temporary activity", async () => {
    await render(
      <ActivityForm
        initialForm={EMPTY_ACTIVITY_FORM}
        submitLabel="Save"
        onSubmit={jest.fn()}
        isSaving={false}
        saveError={null}
      />,
    );
    expect(screen.queryByText("Start date")).not.toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Activity type: Whole year" }),
    );
    await fireEvent.press(screen.getByRole("radio", { name: /Temporary/ }));

    expect(screen.getByText("Start date")).toBeOnTheScreen();
    expect(screen.getByText("End date")).toBeOnTheScreen();
  });

  it("prefills the dates of a saved temporary activity", async () => {
    await render(
      <ActivityForm
        initialForm={{ ...TEMPORARY_FORM }}
        submitLabel="Save"
        onSubmit={jest.fn()}
        isSaving={false}
        saveError={null}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: `Start date: ${formatDate("2099-07-01")}`,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: `End date: ${formatDate("2099-07-15")}`,
      }),
    ).toBeOnTheScreen();
  });

  it("shows the validation error next to the date and does not save", async () => {
    const onSubmit = jest.fn();
    await render(
      <ActivityForm
        initialForm={{ ...TEMPORARY_FORM, endDate: null }}
        submitLabel="Save"
        onSubmit={onSubmit}
        isSaving={false}
        saveError={null}
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Choose the end date")).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the type and the dates", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(
      <ActivityForm
        initialForm={TEMPORARY_FORM}
        submitLabel="Save"
        onSubmit={onSubmit}
        isSaving={false}
        saveError={null}
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "temporary",
        startDate: "2099-07-01",
        endDate: "2099-07-15",
      }),
    );
  });

  it("shows why the server rejected the activity", async () => {
    await render(
      <ActivityForm
        initialForm={TEMPORARY_FORM}
        submitLabel="Save"
        onSubmit={jest.fn()}
        isSaving={false}
        saveError={new Error("The start date cannot be in the past")}
      />,
    );

    expect(
      screen.getByText("The start date cannot be in the past"),
    ).toBeOnTheScreen();
  });
});
