import { fireEvent, render, screen } from "@testing-library/react-native";

import { type TimeSlot } from "@/lib/schedule";
import { ScheduleEditor } from "./ScheduleEditor";

const MONDAY: TimeSlot = {
  day: "monday",
  startTime: "17:00",
  endTime: "18:30",
};
const FRIDAY: TimeSlot = {
  day: "friday",
  startTime: "10:00",
  endTime: "11:00",
};

describe("ScheduleEditor", () => {
  it("shows a message when there are no time slots", async () => {
    await render(<ScheduleEditor schedule={[]} onChange={jest.fn()} />);

    expect(screen.getByText("No time slots yet")).toBeOnTheScreen();
  });

  it("lists the time slots and shows the error", async () => {
    await render(
      <ScheduleEditor
        schedule={[MONDAY, FRIDAY]}
        onChange={jest.fn()}
        error="Invalid slot"
      />,
    );

    expect(screen.getByText("Monday 17:00–18:30")).toBeOnTheScreen();
    expect(screen.getByText("Friday 10:00–11:00")).toBeOnTheScreen();
    expect(screen.getByText("Invalid slot")).toBeOnTheScreen();
  });

  it("removes a time slot", async () => {
    const onChange = jest.fn();
    await render(
      <ScheduleEditor schedule={[MONDAY, FRIDAY]} onChange={onChange} />,
    );

    await fireEvent.press(screen.getByLabelText("Remove Monday 17:00–18:30"));

    expect(onChange).toHaveBeenCalledWith([FRIDAY]);
  });

  it('disables "Add time slot" until the new slot is valid', async () => {
    const onChange = jest.fn();
    await render(<ScheduleEditor schedule={[]} onChange={onChange} />);

    const addButton = screen.getByRole("button", { name: "Add time slot" });
    expect(addButton).toBeDisabled();

    await fireEvent.press(addButton);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("adds a valid time slot and clears the times", async () => {
    const onChange = jest.fn();
    await render(<ScheduleEditor schedule={[FRIDAY]} onChange={onChange} />);

    await fireEvent.press(screen.getByText("Choose a day"));
    await fireEvent.press(screen.getByText("Monday"));
    const [startInput, endInput] = screen.getAllByPlaceholderText("HH:MM");
    await fireEvent.changeText(startInput, "17:00");
    await fireEvent.changeText(endInput, "18:30");
    await fireEvent.press(
      screen.getByRole("button", { name: "Add time slot" }),
    );

    expect(onChange).toHaveBeenCalledWith([MONDAY, FRIDAY]);
    expect(screen.queryByDisplayValue("17:00")).not.toBeOnTheScreen();
  });
});
