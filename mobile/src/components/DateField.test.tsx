import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { formatDate } from "@/lib/dates";

import { DateField } from "./DateField";

const mockedPicker = jest.mocked(DateTimePicker);
const mockedOpen = jest.mocked(DateTimePickerAndroid.open);

function renderField(onChange = jest.fn(), value: string | null = null) {
  return render(
    <DateField
      label="Start date"
      placeholder="Choose a date"
      value={value}
      onChange={onChange}
      minimumDate="2027-07-01"
    />,
  );
}

const field = (text: string) =>
  screen.getByRole("button", { name: `Start date: ${text}` });

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = "ios";
});

describe("DateField", () => {
  it("shows the placeholder without a date", async () => {
    await renderField();

    expect(field("Choose a date")).toBeOnTheScreen();
  });

  it("shows the saved date formatted", async () => {
    await renderField(jest.fn(), "2027-07-15");

    expect(field(formatDate("2027-07-15"))).toBeOnTheScreen();
  });

  it("on iOS, shows the calendar and reports the chosen date", async () => {
    const onChange = jest.fn();
    await renderField(onChange);

    await fireEvent.press(field("Choose a date"));
    const props = mockedPicker.mock.lastCall?.[0];
    expect(props?.minimumDate).toEqual(new Date(2027, 6, 1));
    expect(props).toMatchObject({ themeVariant: "light" });

    await act(async () => {
      props?.onValueChange?.({} as never, new Date(2027, 6, 2));
    });
    expect(onChange).toHaveBeenCalledWith("2027-07-02");
  });

  it("passes the last date that can be chosen to both pickers", async () => {
    await render(
      <DateField
        label="Birthday"
        placeholder="Choose a date"
        value={null}
        onChange={jest.fn()}
        maximumDate="2026-11-21"
      />,
    );
    const birthday = screen.getByRole("button", {
      name: "Birthday: Choose a date",
    });

    await fireEvent.press(birthday);
    const props = mockedPicker.mock.lastCall?.[0];
    expect(props?.maximumDate).toEqual(new Date(2026, 10, 21));
    // Without a value nor a minimum, the calendar opens on the last date
    expect(props?.value).toEqual(new Date(2026, 10, 21));

    Platform.OS = "android";
    await fireEvent.press(birthday);
    expect(mockedOpen.mock.lastCall?.[0].maximumDate).toEqual(
      new Date(2026, 10, 21),
    );
  });

  it("on Android, opens the dialog and reports the chosen date", async () => {
    Platform.OS = "android";
    const onChange = jest.fn();
    await renderField(onChange);

    await fireEvent.press(field("Choose a date"));
    const args = mockedOpen.mock.lastCall?.[0];

    await act(async () => {
      args?.onValueChange?.({} as never, new Date(2027, 6, 2));
    });
    expect(onChange).toHaveBeenCalledWith("2027-07-02");
  });

  it("on the web, uses the browser's date input with the same limits", async () => {
    Platform.OS = "web";
    const onChange = jest.fn();
    await render(
      <DateField
        label="Birthday"
        placeholder="Choose a date"
        value="2019-05-06"
        onChange={onChange}
        minimumDate="1900-01-01"
        maximumDate="2026-11-21"
        error="Too late"
      />,
    );

    const input = screen.getByLabelText("Birthday");
    expect(input.props).toMatchObject({
      type: "date",
      value: "2019-05-06",
      min: "1900-01-01",
      max: "2026-11-21",
    });
    expect(screen.getByText("Too late")).toBeOnTheScreen();
    expect(mockedPicker).not.toHaveBeenCalled();

    await fireEvent(input, "change", { target: { value: "2020-01-02" } });
    expect(onChange).toHaveBeenCalledWith("2020-01-02");

    // Clearing the browser input does not remove the chosen date
    await fireEvent(input, "change", { target: { value: "" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
