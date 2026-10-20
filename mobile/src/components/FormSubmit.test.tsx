import { fireEvent, render, screen } from "@testing-library/react-native";

import { FormSubmit } from "./FormSubmit";

describe("FormSubmit", () => {
  it("calls onPress when the button is pressed", async () => {
    const onPress = jest.fn();
    await render(
      <FormSubmit
        label="Save"
        onPress={onPress}
        isSaving={false}
        hasFieldErrors={false}
        saveError={null}
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(onPress).toHaveBeenCalled();
    expect(
      screen.queryByText("Please fix the errors above before saving."),
    ).not.toBeOnTheScreen();
  });

  it("shows the error summary and the save error", async () => {
    await render(
      <FormSubmit
        label="Save"
        onPress={jest.fn()}
        isSaving={false}
        hasFieldErrors
        saveError="Could not save"
      />,
    );

    expect(
      screen.getByText("Please fix the errors above before saving."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Could not save")).toBeOnTheScreen();
  });

  it("is disabled and busy while saving", async () => {
    const onPress = jest.fn();
    await render(
      <FormSubmit
        label="Save"
        onPress={onPress}
        isSaving
        hasFieldErrors={false}
        saveError={null}
      />,
    );

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toBeBusy();

    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
