import { fireEvent, render, screen } from "@testing-library/react-native";

import { ACTIVITY } from "@/test-utils/activityFixtures";

import { ActivityCard } from "./ActivityCard";

describe("ActivityCard", () => {
  it("shows the title, status, place, ages, schedule, price and dates", async () => {
    await render(
      <ActivityCard
        activity={ACTIVITY}
        address="C/ Major 1, Lleida"
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        isDeleting={false}
      />,
    );

    expect(screen.getByText("Swimming for kids")).toBeOnTheScreen();
    expect(screen.getByText("Published")).toBeOnTheScreen();
    expect(screen.getByText("C/ Major 1, Lleida")).toBeOnTheScreen();
    expect(screen.getByText("Ages: 7–12 years")).toBeOnTheScreen();
    expect(screen.getByText("Tuesday 17:00-18:00")).toBeOnTheScreen();
    expect(screen.getByText("30 €")).toBeOnTheScreen();
    expect(screen.getByText("2026-10-01 – 2026-12-31")).toBeOnTheScreen();
  });

  it("shows a draft without schedule or dates", async () => {
    await render(
      <ActivityCard
        activity={{
          ...ACTIVITY,
          status: "draft",
          schedule: [],
          startDate: null,
          endDate: null,
        }}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        isDeleting={false}
      />,
    );

    expect(screen.getByText("Draft")).toBeOnTheScreen();
    expect(screen.queryByText("Tuesday 17:00-18:00")).not.toBeOnTheScreen();
    expect(screen.queryByText(/2026/)).not.toBeOnTheScreen();
  });

  it("calls onEdit and onDelete from its buttons", async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    await render(
      <ActivityCard
        activity={ACTIVITY}
        onEdit={onEdit}
        onDelete={onDelete}
        isDeleting={false}
      />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Edit Swimming for kids" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Delete Swimming for kids" }),
    );

    expect(onEdit).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });

  it("disables the delete button while deleting", async () => {
    await render(
      <ActivityCard
        activity={ACTIVITY}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        isDeleting
      />,
    );

    expect(
      screen.getByRole("button", { name: "Delete Swimming for kids" }),
    ).toBeDisabled();
  });
});