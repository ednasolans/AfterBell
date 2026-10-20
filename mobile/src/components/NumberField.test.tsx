import { fireEvent, render, screen } from "@testing-library/react-native";

import { parseInteger } from "@/lib/numbers";

import { NumberField } from "./NumberField";

describe("NumberField", () => {
  it("sends the parsed number while keeping the typed text", async () => {
    const onChange = jest.fn();
    await render(
      <NumberField
        label="People"
        value={null}
        onChange={onChange}
        parse={parseInteger}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText("People"), "12");
    expect(onChange).toHaveBeenLastCalledWith(12);

    await fireEvent.changeText(screen.getByLabelText("People"), "12a");
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByDisplayValue("12a")).toBeOnTheScreen();
  });
});
