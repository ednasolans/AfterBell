import { fireEvent, render, screen } from "@testing-library/react-native";

import { ACTIVITY } from "@/test-utils/activityFixtures";

import { ActivityCard } from "./ActivityCard";

describe("ActivityCard", () => {
  it("shows the title, category, schedule and price", async () => {
    await render(
      <ActivityCard
        activity={ACTIVITY}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        isDeleting={false}
      />,
    );

    expect(screen.getByText("Swimming for kids")).toBeOnTheScreen();
    expect(screen.getByText("Swimming")).toBeOnTheScreen();
    expect(screen.getByText("Tuesday 17:00–18:00")).toBeOnTheScreen();
    expect(screen.getByText("30–40 € per month")).toBeOnTheScreen();
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
