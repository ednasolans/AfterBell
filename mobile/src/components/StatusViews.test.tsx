import { fireEvent, render, screen } from "@testing-library/react-native";

import { ErrorView } from "./ErrorView";
import { LoadingView } from "./LoadingView";

describe("LoadingView", () => {
  it("tells screen readers that the content is loading", async () => {
    await render(<LoadingView />);

    expect(screen.getByLabelText("Loading")).toBeBusy();
  });
});

describe("ErrorView", () => {
  it("shows the message and retries when the button is pressed", async () => {
    const onRetry = jest.fn();
    await render(<ErrorView message="Could not load" onRetry={onRetry} />);

    expect(screen.getByText("Could not load")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
