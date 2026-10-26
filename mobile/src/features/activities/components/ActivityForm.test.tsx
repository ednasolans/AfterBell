import { fireEvent, render, screen } from "@testing-library/react-native";

import { EMPTY_ACTIVITY_FORM } from "../types";
import { ActivityForm } from "./ActivityForm";

jest.mock("./AddressSelect", () => ({
  AddressSelect: () => null,
}));

describe("ActivityForm", () => {
  it("shows the fields for the current activity schema", async () => {
    await render(
      <ActivityForm
        initialForm={EMPTY_ACTIVITY_FORM}
        submitLabel="Save"
        onSubmit={jest.fn()}
        isSaving={false}
        saveFailed={false}
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
        saveFailed={false}
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
