import { act, renderHook } from "@testing-library/react-native";

import {
  findCoordinates,
  findTown,
  getCurrentCoordinates,
} from "@/lib/location";

import { NO_CURRENT_LOCATION, TOWN_NOT_FOUND } from "../locationErrors";
import { useFamilyLocationForm } from "./useFamilyLocationForm";

jest.mock("@/lib/location", () => ({
  getCurrentCoordinates: jest.fn(),
  findTown: jest.fn(),
  findCoordinates: jest.fn(),
}));

const PHONE = { latitude: 41.6176, longitude: 0.62 };
const TOWN_CENTRE = { latitude: 41.67, longitude: 0.555 };

async function renderForm(initialCity: string | null = null) {
  const onSave = jest.fn().mockResolvedValue(undefined);
  const rendered = await renderHook(() =>
    useFamilyLocationForm({ initialCity, onSave }),
  );
  return { ...rendered, onSave };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useFamilyLocationForm", () => {
  it("starts with the saved town and no errors", async () => {
    const { result } = await renderForm("Lleida");

    expect(result.current.city).toBe("Lleida");
    expect(result.current.cityError).toBeNull();
    expect(result.current.locationError).toBeNull();
  });

  it("fills in the town where the phone is", async () => {
    jest.mocked(getCurrentCoordinates).mockResolvedValue(PHONE);
    jest.mocked(findTown).mockResolvedValue("Lleida");
    const { result } = await renderForm();

    await act(() => result.current.locate());

    expect(result.current.city).toBe("Lleida");
    expect(result.current.isLocating).toBe(false);
  });

  it("explains when the position cannot be read", async () => {
    jest.mocked(getCurrentCoordinates).mockResolvedValue(null);
    const { result } = await renderForm();

    await act(() => result.current.locate());

    expect(result.current.locationError).toBe(NO_CURRENT_LOCATION);
    expect(findTown).not.toHaveBeenCalled();
  });

  it("explains when the town of the position cannot be found", async () => {
    jest.mocked(getCurrentCoordinates).mockResolvedValue(PHONE);
    jest.mocked(findTown).mockResolvedValue(null);
    const { result } = await renderForm();

    await act(() => result.current.locate());

    expect(result.current.locationError).toBe(NO_CURRENT_LOCATION);
    expect(result.current.city).toBe("");
  });

  it("saves the town found with the GPS with the point of the phone", async () => {
    jest.mocked(getCurrentCoordinates).mockResolvedValue(PHONE);
    jest.mocked(findTown).mockResolvedValue("Lleida");
    const { result, onSave } = await renderForm();

    await act(() => result.current.locate());
    const saved = await act(() => result.current.submit());

    expect(saved).toBe(true);
    expect(onSave).toHaveBeenCalledWith({ city: "Lleida", coordinates: PHONE });
    expect(findCoordinates).not.toHaveBeenCalled();
  });

  it("finds the point of a town typed by hand", async () => {
    jest.mocked(findCoordinates).mockResolvedValue(TOWN_CENTRE);
    const { result, onSave } = await renderForm();

    await act(() => result.current.setCity("  Alpicat "));
    await act(() => result.current.submit());

    expect(findCoordinates).toHaveBeenCalledWith("Alpicat");
    expect(onSave).toHaveBeenCalledWith({
      city: "Alpicat",
      coordinates: TOWN_CENTRE,
    });
  });

  it("does not reuse the GPS point when the town was changed by hand", async () => {
    jest.mocked(getCurrentCoordinates).mockResolvedValue(PHONE);
    jest.mocked(findTown).mockResolvedValue("Lleida");
    jest.mocked(findCoordinates).mockResolvedValue(TOWN_CENTRE);
    const { result, onSave } = await renderForm();

    await act(() => result.current.locate());
    await act(() => result.current.setCity("Alpicat"));
    await act(() => result.current.submit());

    expect(onSave).toHaveBeenCalledWith({
      city: "Alpicat",
      coordinates: TOWN_CENTRE,
    });
  });

  it("does not save and explains when the town cannot be found", async () => {
    jest.mocked(findCoordinates).mockResolvedValue(null);
    const { result, onSave } = await renderForm("Nowhere");

    const saved = await act(() => result.current.submit());

    expect(saved).toBe(false);
    expect(result.current.locationError).toBe(TOWN_NOT_FOUND);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("does not look for an empty town and shows the error", async () => {
    const { result, onSave } = await renderForm();

    const saved = await act(() => result.current.submit());

    expect(saved).toBe(false);
    expect(result.current.cityError).toBe("Enter your city or town");
    expect(findCoordinates).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("returns false when saving fails", async () => {
    jest.mocked(findCoordinates).mockResolvedValue(TOWN_CENTRE);
    const onSave = jest.fn().mockRejectedValue(new Error("offline"));
    const { result } = await renderHook(() =>
      useFamilyLocationForm({ initialCity: "Lleida", onSave }),
    );

    const saved = await act(() => result.current.submit());

    expect(saved).toBe(false);
  });
});
