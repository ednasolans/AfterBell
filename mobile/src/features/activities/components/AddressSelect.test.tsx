import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { fetchMyAddresses } from "../api/fetchMyAddresses";
import { AddressSelect } from "./AddressSelect";

jest.mock("../api/fetchMyAddresses", () => ({ fetchMyAddresses: jest.fn() }));

const mockedFetch = jest.mocked(fetchMyAddresses);

async function renderSelect(onChange = jest.fn(), error?: string) {
  await render(
    <AddressSelect value={null} onChange={onChange} error={error} />,
    { wrapper: createQueryClientWrapper(createTestQueryClient()) },
  );
}

beforeEach(() => {
  mockedFetch.mockReset();
});

describe("AddressSelect", () => {
  it("lets the provider choose one of its addresses", async () => {
    mockedFetch.mockResolvedValue([
      { id: "address-1", address: "C/ Major 1", city: "Lleida" },
      { id: "address-2", address: "Av. Catalunya 5", city: "Balaguer" },
    ]);
    const onChange = jest.fn();
    await renderSelect(onChange);

    await fireEvent.press(
      await screen.findByText("Choose where it takes place"),
    );
    await fireEvent.press(screen.getByText("Av. Catalunya 5, Balaguer"));

    expect(onChange).toHaveBeenCalledWith("address-2");
  });

  it("shows a message while the addresses load", async () => {
    mockedFetch.mockReturnValue(new Promise(() => {}));
    await renderSelect();

    expect(screen.getByText("Loading your addresses…")).toBeOnTheScreen();
  });

  it("asks to add addresses in the technical sheet when there are none", async () => {
    mockedFetch.mockResolvedValue([]);
    await renderSelect(jest.fn(), "Choose where the activity takes place");

    expect(
      await screen.findByText(
        "Add your addresses in your technical sheet before creating an activity.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Choose where the activity takes place"),
    ).toBeOnTheScreen();
  });

  it("can load the addresses again after an error", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("Network error"));
    await renderSelect();

    const retry = await screen.findByRole("button", { name: "Try again" });
    mockedFetch.mockResolvedValue([
      { id: "address-1", address: "C/ Major 1", city: "Lleida" },
    ]);
    await fireEvent.press(retry);

    expect(
      await screen.findByText("Choose where it takes place"),
    ).toBeOnTheScreen();
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });
});
