import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  findCoordinates,
  findTown,
  getCurrentCoordinates,
} from "@/lib/location";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@/test-utils/queryClientWrapper";

import { fetchFamilyCity, saveFamilyLocation } from "../api/familyLocation";
import { FamilyLocationCard } from "./FamilyLocationCard";

// The query keys come from the family profiles hooks, which load the client
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("../api/familyLocation", () => ({
  fetchFamilyCity: jest.fn(),
  saveFamilyLocation: jest.fn(),
}));
jest.mock("@/lib/location", () => ({
  getCurrentCoordinates: jest.fn(),
  findTown: jest.fn(),
  findCoordinates: jest.fn(),
}));

const TOWN_CENTRE = { latitude: 41.67, longitude: 0.555 };

async function renderCard() {
  await render(<FamilyLocationCard />, {
    wrapper: createQueryClientWrapper(createTestQueryClient()),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("FamilyLocationCard", () => {
  it("invites the family to add its town", async () => {
    jest.mocked(fetchFamilyCity).mockResolvedValue(null);
    await renderCard();

    expect(
      await screen.findByText("Add your town to see activities near you."),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Your location" }),
    ).toBeOnTheScreen();
  });

  it("shows the saved town", async () => {
    jest.mocked(fetchFamilyCity).mockResolvedValue("Lleida");
    await renderCard();

    expect(await screen.findByText("Lleida")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Change your town" }),
    ).toBeOnTheScreen();
  });

  it("saves a town typed by hand and shows it", async () => {
    jest
      .mocked(fetchFamilyCity)
      .mockResolvedValueOnce(null)
      .mockResolvedValue("Alpicat");
    jest.mocked(findCoordinates).mockResolvedValue(TOWN_CENTRE);
    jest.mocked(saveFamilyLocation).mockResolvedValue();
    await renderCard();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Add your town" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("City or town"),
      "Alpicat",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Alpicat")).toBeOnTheScreen();
    expect(saveFamilyLocation).toHaveBeenCalledWith(
      { city: "Alpicat", coordinates: TOWN_CENTRE },
      expect.anything(),
    );
  });

  it("fills in the town with the current location", async () => {
    jest.mocked(fetchFamilyCity).mockResolvedValue(null);
    jest
      .mocked(getCurrentCoordinates)
      .mockResolvedValue({ latitude: 41.6176, longitude: 0.62 });
    jest.mocked(findTown).mockResolvedValue("Lleida");
    await renderCard();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Add your town" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Use my current location" }),
    );

    expect(await screen.findByDisplayValue("Lleida")).toBeOnTheScreen();
    expect(screen.getByText(/never your exact address/)).toBeOnTheScreen();
  });

  it("explains when the town cannot be found and keeps editing", async () => {
    jest.mocked(fetchFamilyCity).mockResolvedValue(null);
    jest.mocked(findCoordinates).mockResolvedValue(null);
    await renderCard();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Add your town" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("City or town"),
      "Nowhere",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(/We could not find this town/),
    ).toBeOnTheScreen();
    expect(saveFamilyLocation).not.toHaveBeenCalled();
    expect(screen.getByLabelText("City or town")).toBeOnTheScreen();
  });

  it("hides technical errors when saving fails", async () => {
    jest.mocked(fetchFamilyCity).mockResolvedValue("Lleida");
    jest.mocked(findCoordinates).mockResolvedValue(TOWN_CENTRE);
    jest
      .mocked(saveFamilyLocation)
      .mockRejectedValue(new Error("Network request failed"));
    await renderCard();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Change your town" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("City or town"),
      "Alpicat",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(
        "Your town could not be saved. Please try again.",
      ),
    ).toBeOnTheScreen();
  });

  it("goes back to the town without saving on cancel", async () => {
    jest.mocked(fetchFamilyCity).mockResolvedValue("Lleida");
    await renderCard();

    await fireEvent.press(
      await screen.findByRole("button", { name: "Change your town" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByText("Lleida")).toBeOnTheScreen();
    expect(saveFamilyLocation).not.toHaveBeenCalled();
  });

  it("shows an error and tries again when the town cannot be loaded", async () => {
    jest
      .mocked(fetchFamilyCity)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue("Lleida");
    await renderCard();

    expect(
      await screen.findByText("Your town could not be loaded."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Lleida")).toBeOnTheScreen();
  });
});
