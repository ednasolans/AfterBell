
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import { formatDate } from "@/lib/dates";

import { FamilyProfileForm } from "./FamilyProfileForm";

const mockedPicker = jest.mocked(DateTimePicker);

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
      screen.getByText("Enter the date of birth"),
    ).toBeTruthy();

    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows existing profile values when editing", async () => {
    await render(
      <FamilyProfileForm
        initialValues={{
          firstName: "Anna",
          dateOfBirth: "2018-03-01",
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
      screen.getByRole("button", {
        name: `Date of birth: ${formatDate("2018-03-01")}`,
      }),
    ).toBeTruthy();

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
          dateOfBirth: "2018-03-01",
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
        dateOfBirth: "2018-03-01",
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
          dateOfBirth: "2018-03-01",
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
          dateOfBirth: "2018-03-01",
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

  it("explains why the date of birth is asked", async () => {
    await render(<FamilyProfileForm onSave={jest.fn()} isSaving={false} />);

    expect(
      screen.getByText(/keep the age right as they grow/),
    ).toBeTruthy();
  });

  it("saves the date chosen in the calendar, which ends today", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    await render(
      <FamilyProfileForm
        initialValues={{
          firstName: "Anna",
          dateOfBirth: null,
          interests: [],
        }}
        onSave={onSave}
        isSaving={false}
      />,
    );

    await fireEvent.press(
      screen.getByRole("button", {
        name: "Date of birth: Choose the date of birth",
      }),
    );
    const props = mockedPicker.mock.lastCall?.[0];
    const today = new Date();
    expect(props?.maximumDate).toEqual(
      new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    );
    await act(async () => {
      props?.onValueChange?.({} as never, new Date(2019, 4, 6));
    });

    await fireEvent.press(screen.getByLabelText("Save profile"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        firstName: "Anna",
        dateOfBirth: "2019-05-06",
        interests: [],
      });
    });
  });

  it("asks to complete an old profile without a date of birth", async () => {
    const onSave = jest.fn();
    await render(
      <FamilyProfileForm
        initialValues={{
          firstName: "Anna",
          dateOfBirth: null,
          interests: ["music"],
        }}
        onSave={onSave}
        isSaving={false}
      />,
    );

    await fireEvent.press(screen.getByLabelText("Save profile"));

    expect(screen.getByText("Enter the date of birth")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
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
