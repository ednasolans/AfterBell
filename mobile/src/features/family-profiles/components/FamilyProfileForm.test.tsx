
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import { FamilyProfileForm } from "./FamilyProfileForm";

describe("FamilyProfileForm", () => {
  it("shows errors and does not save an empty form", async () => {
    const onSave = jest.fn();

    await render(
      <FamilyProfileForm
        onSave={onSave}
        isSaving={false}
      />,
    );

    await fireEvent.press(
      screen.getByLabelText("Save profile"),
    );

    expect(
      screen.getByText("First name is required"),
    ).toBeTruthy();

    expect(
      screen.getByText("Select a valid age range"),
    ).toBeTruthy();

    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows existing profile values when editing", async () => {
    await render(
      <FamilyProfileForm
        initialValues={{
          firstName: "Anna",
          ageRange: "7-9",
          interests: ["music"],
        }}
        onSave={jest.fn()}
        isSaving={false}
      />,
    );

    expect(
      screen.getByDisplayValue("Anna"),
    ).toBeTruthy();

    expect(
      screen.getByText("7-9").parent?.props.accessibilityState,
    ).toEqual({ checked: true });

    expect(
      screen.getByText("music").parent?.props.accessibilityState,
    ).toEqual({ checked: true });
  });

  it("saves valid profile values", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    await render(
      <FamilyProfileForm
        initialValues={{
          firstName: "Anna",
          ageRange: "7-9",
          interests: ["music"],
        }}
        onSave={onSave}
        isSaving={false}
      />,
    );

    await fireEvent.press(
      screen.getByLabelText("Save profile"),
    );

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        firstName: "Anna",
        ageRange: "7-9",
        interests: ["music"],
      });
    });
  });

  it("allows selecting an additional interest", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    await render(
      <FamilyProfileForm
        initialValues={{
          firstName: "Anna",
          ageRange: "7-9",
          interests: ["music"],
        }}
        onSave={onSave}
        isSaving={false}
      />,
    );

    await fireEvent.press(screen.getByText("swimming"));

    await fireEvent.press(
      screen.getByLabelText("Save profile"),
    );

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          interests: ["music", "swimming"],
        }),
      );
    });
  });

  it("allows deselecting an interest", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    await render(
      <FamilyProfileForm
        initialValues={{
          firstName: "Anna",
          ageRange: "7-9",
          interests: ["music", "swimming"],
        }}
        onSave={onSave}
        isSaving={false}
      />,
    );

    await fireEvent.press(screen.getByText("music"));

    await fireEvent.press(
      screen.getByLabelText("Save profile"),
    );

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          interests: ["swimming"],
        }),
      );
    });
  });

  it("disables the save button while saving", async () => {
    await render(
      <FamilyProfileForm
        onSave={jest.fn()}
        isSaving={true}
      />,
    );

    expect(
      screen.getByLabelText("Save profile").props.accessibilityState
        ?.disabled,
    ).toBe(true);
  });

  it("shows the save error", async () => {
    await render(
      <FamilyProfileForm
        onSave={jest.fn()}
        isSaving={false}
        saveError="Could not save profile"
      />,
    );

    expect(
      screen.getByText("Could not save profile"),
    ).toBeTruthy();
  });
});
