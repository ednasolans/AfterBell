import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import { ACTIVITY } from "@/test-utils/activityFixtures";

import { CustomerActivityCard } from "./CustomerActivityCard";

describe("CustomerActivityCard", () => {
  it("shows the activity and opens it", async () => {
    const onPress = jest.fn();
    await render(
      <CustomerActivityCard
        activity={ACTIVITY}
        providerName="Pool club"
        schedule={ACTIVITY.schedule}
        onPress={onPress}
      />,
    );

    expect(screen.getByText("Swimming for kids")).toBeOnTheScreen();
    expect(screen.getByText("Pool club")).toBeOnTheScreen();
    expect(screen.getByText("Tue, 17:00")).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole("button", { name: "Open Swimming for kids" }),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("says which profiles the activity fits", async () => {
    await render(
      <CustomerActivityCard
        activity={ACTIVITY}
        providerName={null}
        suitableFor={["Marc", "Laia"]}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Suitable for Marc, Laia")).toBeOnTheScreen();
  });

  it("shows no profiles when none are given", async () => {
    await render(
      <CustomerActivityCard
        activity={ACTIVITY}
        providerName={null}
        onPress={jest.fn()}
      />,
    );

    expect(screen.queryByText(/Suitable for/)).not.toBeOnTheScreen();
  });

  it("draws the accessory outside the card button", async () => {
    const onAccessory = jest.fn();
    await render(
      <CustomerActivityCard
        activity={ACTIVITY}
        providerName={null}
        accessory={
          <Pressable accessibilityRole="button" onPress={onAccessory}>
            <Text>Extra</Text>
          </Pressable>
        }
        onPress={jest.fn()}
      />,
    );

    const card = screen.getByRole("button", { name: "Open Swimming for kids" });
    expect(within(card).queryByText("Extra")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Extra" }));
    expect(onAccessory).toHaveBeenCalledTimes(1);
  });

  it("marks an activity that cannot be opened", async () => {
    await render(
      <CustomerActivityCard
        activity={ACTIVITY}
        providerName={null}
        unavailable
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Swimming for kids, not available" }),
    ).toBeDisabled();
    expect(screen.getByText("Not available")).toBeOnTheScreen();
  });
});
