import DateTimePicker from "@react-native-community/datetimepicker";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { formatDate } from "@/lib/dates";

import {
  EMPTY_ACTIVITY_FORM,
  type ActivityForm as ActivityFormValues,
} from "../types";
import { ActivityForm } from "./ActivityForm";

jest.mock("./AddressSelect", () => ({
  AddressSelect: () => null,
}));

// The catalogue of the database, with a category the app does not know yet
jest.mock("@/lib/useCategories", () => ({
  useCategories: () => ({
    data: [
      { name: "swimming", type: "individual" },
      { name: "language", type: "individual" },
      { name: "board_games", type: "collective" },
    ],
  }),
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

  it("offers the categories of the database", async () => {
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
      screen.getByRole("button", { name: "Category: Choose a category" }),
    );
    await fireEvent.press(screen.getByRole("radio", { name: /Board games/ }));

    expect(
      screen.getByRole("button", { name: "Category: Board games" }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("radio", { name: /Football/ }),
    ).not.toBeOnTheScreen();
  });

  it("lets providers mark tutoring and add, edit and remove language pairs", async () => {
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

    expect(screen.queryByRole("button", { name: "Add language" })).toBeNull();
    await fireEvent(
      screen.getByLabelText("Private tutoring"),
      "valueChange",
      true,
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Category: Swimming" }),
    );
    await fireEvent.press(screen.getByRole("radio", { name: /^Language/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Add language" }));
    await fireEvent.changeText(screen.getByLabelText("Language 1"), "English");

    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a language and level for each entry.",
    );
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText("Level 1"), "B1");
    await fireEvent.press(screen.getByRole("button", { name: "Add language" }));
    await fireEvent.press(
      screen.getByRole("button", { name: "Remove language 2" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "language",
        isTutor: true,
        languages: [{ language: "English", level: "B1" }],
      }),
    );
  });

  it("shows the header above the form", async () => {
    await render(
      <ActivityForm
        initialForm={EMPTY_ACTIVITY_FORM}
        submitLabel="Save"
        onSubmit={jest.fn()}
        isSaving={false}
        saveError={null}
        header={<Text>Publication header</Text>}
      />,
    );

    expect(screen.getByText("Publication header")).toBeOnTheScreen();
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
      screen.getByRole("button", { name: "Activity type: Activity" }),
    );
    await fireEvent.press(screen.getByRole("radio", { name: /Temporary/ }));

    expect(
      screen.getByRole("button", { name: "Activity type: Temporary" }),
    ).toBeOnTheScreen();
  });

  it("shows dates when changing from Activity to Temporary", async () => {
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
      screen.getByRole("button", { name: "Activity type: Activity" }),
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

  it("hides the maximum and saves no limit when the provider chooses it", async () => {
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

    expect(screen.getByLabelText("Maximum participants")).toBeOnTheScreen();
    await fireEvent(
      screen.getByLabelText("No limit of participants"),
      "valueChange",
      true,
    );
    expect(screen.queryByLabelText("Maximum participants")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        maxParticipants: null,
        unlimitedParticipants: true,
      }),
    );
  });

  it("shows no limit for a saved activity without maximum", async () => {
    await render(
      <ActivityForm
        initialForm={{
          ...TEMPORARY_FORM,
          maxParticipants: null,
          unlimitedParticipants: true,
        }}
        submitLabel="Save"
        onSubmit={jest.fn()}
        isSaving={false}
        saveError={null}
      />,
    );

    expect(screen.getByLabelText("No limit of participants")).toHaveProp(
      "value",
      true,
    );
    expect(screen.queryByLabelText("Maximum participants")).toBeNull();
  });

  it("gives the header whether there are unsaved changes", async () => {
    await render(
      <ActivityForm
        initialForm={TEMPORARY_FORM}
        submitLabel="Save"
        onSubmit={jest.fn()}
        isSaving={false}
        saveError={null}
        header={({ hasUnsavedChanges }) => (
          <Text>{hasUnsavedChanges ? "Changed" : "Saved"}</Text>
        )}
      />,
    );

    expect(screen.getByText("Saved")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Title"), "Other camp");
    expect(screen.getByText("Changed")).toBeOnTheScreen();
  });
});

const EVENT_FORM: ActivityFormValues = {
  ...TEMPORARY_FORM,
  type: "event",
  schedule: [],
};

async function renderForm(
  initialForm: ActivityFormValues,
  onSubmit = jest.fn().mockResolvedValue(undefined),
) {
  await render(
    <ActivityForm
      initialForm={initialForm}
      submitLabel="Save"
      onSubmit={onSubmit}
      isSaving={false}
      saveError={null}
    />,
  );
  return onSubmit;
}

async function chooseType(current: string, next: string) {
  await fireEvent.press(
    screen.getByRole("button", { name: `Activity type: ${current}` }),
  );
  await fireEvent.press(screen.getByRole("radio", { name: next }));
}

async function chooseDate(label: string, date: Date) {
  await fireEvent.press(
    screen.getByRole("button", { name: `${label}: Choose a date` }),
  );
  const props = jest.mocked(DateTimePicker).mock.lastCall?.[0];
  expect(props).toBeDefined();
  await act(() => props?.onValueChange?.({} as never, date));
}

describe("Activity/Event form", () => {
  it("places the type selector before the other form controls", async () => {
    await renderForm(EMPTY_ACTIVITY_FORM);

    expect(screen.getAllByRole("button")[0]).toHaveAccessibleName(
      "Activity type: Activity",
    );
    expect(screen.queryByText("Start date")).not.toBeOnTheScreen();
    expect(screen.queryByText("End date")).not.toBeOnTheScreen();
    expect(
      screen.getByRole("header", {
        name: "Weekly schedule (required)",
      }),
    ).toBeOnTheScreen();
  });

  it("creates an event after switching type and entering dates", async () => {
    const initial = {
      ...TEMPORARY_FORM,
      type: "whole_year" as const,
      startDate: null,
      endDate: null,
    };
    const onSubmit = await renderForm(initial);

    await chooseType("Activity", "Event");

    expect(
      screen.getByRole("header", {
        name: "Weekly schedule (optional)",
      }),
    ).toBeOnTheScreen();
    await chooseDate("Start date", new Date(2099, 6, 1));
    await chooseDate("End date", new Date(2099, 6, 15));
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      ...initial,
      type: "event",
      startDate: "2099-07-01",
      endDate: "2099-07-15",
    });
  });

  it("opens and saves an existing event without weekly slots", async () => {
    const onSubmit = await renderForm(EVENT_FORM);

    expect(
      screen.getByRole("button", {
        name: `Start date: ${formatDate(EVENT_FORM.startDate!)}`,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: `End date: ${formatDate(EVENT_FORM.endDate!)}`,
      }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith(EVENT_FORM);
    expect(
      screen.queryByText("Add at least one time slot"),
    ).not.toBeOnTheScreen();
  });

  it("clears dates when switching to Activity and preserves shared fields", async () => {
    const event = { ...TEMPORARY_FORM, type: "event" as const };
    const onSubmit = await renderForm(event);
    await fireEvent.changeText(screen.getByLabelText("Title"), "Changed title");

    await chooseType("Event", "Activity");

    expect(screen.queryByText("Start date")).not.toBeOnTheScreen();
    expect(screen.queryByText("End date")).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      ...event,
      title: "Changed title",
      type: "whole_year",
      startDate: null,
      endDate: null,
    });
  });

  it("requires a weekly slot after an event becomes an activity", async () => {
    const onSubmit = await renderForm(EVENT_FORM);
    await chooseType("Event", "Activity");
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Add at least one time slot")).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.press(
      screen.getByRole("button", { name: "Day: Choose a day" }),
    );
    await fireEvent.press(screen.getByRole("radio", { name: "Monday" }));
    await fireEvent.changeText(screen.getByLabelText("Start"), "10:00");
    await fireEvent.changeText(screen.getByLabelText("End"), "12:00");
    await fireEvent.press(
      screen.getByRole("button", { name: "Add time slot" }),
    );
    expect(
      screen.queryByText("Add at least one time slot"),
    ).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledWith({
      ...EVENT_FORM,
      type: "whole_year",
      startDate: null,
      endDate: null,
      schedule: TEMPORARY_FORM.schedule,
    });
  });

  it("clears date values on a round trip and shows required date errors", async () => {
    const onSubmit = await renderForm(EVENT_FORM);

    await chooseType("Event", "Activity");
    await chooseType("Activity", "Event");

    expect(
      screen.getByRole("button", {
        name: "Start date: Choose a date",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "End date: Choose a date",
      }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Choose the start date")).toBeOnTheScreen();
    expect(screen.getByText("Choose the end date")).toBeOnTheScreen();
    expect(
      screen.queryByText("Add at least one time slot"),
    ).not.toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("resets unfinished time slot inputs when changing type", async () => {
    await renderForm({
      ...TEMPORARY_FORM,
      type: "whole_year",
      startDate: null,
      endDate: null,
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Day: Choose a day" }),
    );
    await fireEvent.press(screen.getByRole("radio", { name: "Tuesday" }));
    await fireEvent.changeText(screen.getByLabelText("Start"), "16:00");
    await fireEvent.changeText(screen.getByLabelText("End"), "17:00");

    await chooseType("Activity", "Event");

    expect(screen.getByLabelText("Start")).toHaveDisplayValue("");
    expect(screen.getByLabelText("End")).toHaveDisplayValue("");
    expect(
      screen.getByRole("button", { name: "Day: Choose a day" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Add time slot" }),
    ).toBeDisabled();
    expect(screen.getByText("Monday 10:00–12:00")).toBeOnTheScreen();
  });

  it.each([
    {
      startDate: "2099-07-15",
      endDate: "2099-07-01",
      error: "The end date cannot be before the start date",
    },
    {
      startDate: "2000-07-01",
      endDate: "2099-07-15",
      error: "The start date cannot be in the past",
    },
  ])(
    "shows date errors after switching to Event ($error)",
    async ({ startDate, endDate, error }) => {
      const onSubmit = await renderForm({
        ...EVENT_FORM,
        type: "temporary",
        startDate,
        endDate,
      });
      await chooseType("Temporary", "Event");

      await fireEvent.press(screen.getByRole("button", { name: "Save" }));
      expect(screen.getByText(error)).toBeOnTheScreen();
      expect(onSubmit).not.toHaveBeenCalled();
    },
  );
});
