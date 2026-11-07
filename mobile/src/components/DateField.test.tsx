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
});
