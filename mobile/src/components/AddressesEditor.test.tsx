import { fireEvent, render, screen } from "@testing-library/react-native";

import { type AddressForm } from "@/lib/addresses";

import { AddressesEditor } from "./AddressesEditor";

const MAIN: AddressForm = { address: "C/ Major 1", city: "Lleida" };
const SECOND: AddressForm = { address: "Av. Catalunya 5", city: "Balaguer" };

describe("AddressesEditor", () => {
  it("shows the first address as the main one, without a remove button", async () => {
    await render(<AddressesEditor addresses={[MAIN]} onChange={jest.fn()} />);

    expect(screen.getByText("Main address")).toBeOnTheScreen();
    expect(screen.getByLabelText("Street and number 1")).toHaveDisplayValue(
      "C/ Major 1",
    );
    expect(screen.getByLabelText("City 1")).toHaveDisplayValue("Lleida");
    expect(
      screen.queryByRole("button", { name: "Remove address 1" }),
    ).not.toBeOnTheScreen();
  });

  it("changes only the edited field of the edited address", async () => {
    const onChange = jest.fn();
    await render(
      <AddressesEditor addresses={[MAIN, SECOND]} onChange={onChange} />,
    );

    await fireEvent.changeText(screen.getByLabelText("City 2"), "Mollerussa");

    expect(onChange).toHaveBeenCalledWith([
      MAIN,
      { address: "Av. Catalunya 5", city: "Mollerussa" },
    ]);
  });

  it("changes the street of an address", async () => {
    const onChange = jest.fn();
    await render(<AddressesEditor addresses={[MAIN]} onChange={onChange} />);

    await fireEvent.changeText(
      screen.getByLabelText("Street and number 1"),
      "C/ Major 2",
    );

    expect(onChange).toHaveBeenCalledWith([
      { address: "C/ Major 2", city: "Lleida" },
    ]);
  });

  it("adds an empty address at the end", async () => {
    const onChange = jest.fn();
    await render(<AddressesEditor addresses={[MAIN]} onChange={onChange} />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Add another address" }),
    );

    expect(onChange).toHaveBeenCalledWith([MAIN, { address: "", city: "" }]);
  });

  it("removes an address that is not the main one", async () => {
    const onChange = jest.fn();
    await render(
      <AddressesEditor addresses={[MAIN, SECOND]} onChange={onChange} />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Remove address 2" }),
    );

    expect(onChange).toHaveBeenCalledWith([MAIN]);
  });

  it("shows the errors under the right address", async () => {
    await render(
      <AddressesEditor
        addresses={[MAIN, { address: "", city: "" }]}
        onChange={jest.fn()}
        errors={[{}, { city: "City is required" }]}
      />,
    );

    expect(screen.getByText("City is required")).toBeOnTheScreen();
    expect(screen.getAllByText("City is required")).toHaveLength(1);
  });
});
