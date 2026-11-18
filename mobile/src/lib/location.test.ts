import * as Location from "expo-location";

import {
  findCoordinates,
  findTown,
  getCurrentCoordinates,
  toPoint,
} from "./location";

jest.mock("expo-location", () => ({
  Accuracy: { Low: 2 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  geocodeAsync: jest.fn(),
}));

const LLEIDA = { latitude: 41.6176, longitude: 0.62 };

function permission(granted: boolean) {
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted } as Location.LocationPermissionResponse);
}

function place(fields: Partial<Location.LocationGeocodedAddress>) {
  return {
    city: null,
    subregion: null,
    ...fields,
  } as Location.LocationGeocodedAddress;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getCurrentCoordinates", () => {
  it("returns only the latitude and longitude, with low accuracy", async () => {
    permission(true);
    jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: { ...LLEIDA, altitude: 150, accuracy: 900 },
      timestamp: 1,
    } as Location.LocationObject);

    expect(await getCurrentCoordinates()).toEqual(LLEIDA);
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.Low,
    });
  });

  it("returns null without asking for the position when permission is denied", async () => {
    permission(false);

    expect(await getCurrentCoordinates()).toBeNull();
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it("returns null when the position cannot be read", async () => {
    permission(true);
    jest
      .mocked(Location.getCurrentPositionAsync)
      .mockRejectedValue(new Error("Location services are off"));

    expect(await getCurrentCoordinates()).toBeNull();
  });
});

describe("findTown", () => {
  it("returns the city of the point", async () => {
    jest
      .mocked(Location.reverseGeocodeAsync)
      .mockResolvedValue([place({ city: "Lleida", subregion: "Segrià" })]);

    expect(await findTown(LLEIDA)).toBe("Lleida");
    expect(Location.reverseGeocodeAsync).toHaveBeenCalledWith(LLEIDA);
  });

  it("uses the area when a small village has no city", async () => {
    jest
      .mocked(Location.reverseGeocodeAsync)
      .mockResolvedValue([place({ subregion: "Segrià" })]);

    expect(await findTown(LLEIDA)).toBe("Segrià");
  });

  it("returns null when nothing is found or it fails", async () => {
    jest.mocked(Location.reverseGeocodeAsync).mockResolvedValueOnce([]);
    expect(await findTown(LLEIDA)).toBeNull();

    jest
      .mocked(Location.reverseGeocodeAsync)
      .mockRejectedValueOnce(new Error("offline"));
    expect(await findTown(LLEIDA)).toBeNull();
  });
});

describe("findCoordinates", () => {
  it("returns the point of the first result", async () => {
    permission(true);
    jest
      .mocked(Location.geocodeAsync)
      .mockResolvedValue([{ ...LLEIDA, accuracy: 50 }]);

    expect(await findCoordinates("Lleida, Spain")).toEqual(LLEIDA);
    expect(Location.geocodeAsync).toHaveBeenCalledWith("Lleida, Spain");
  });

  it("returns null without geocoding when permission is denied", async () => {
    permission(false);

    expect(await findCoordinates("Lleida")).toBeNull();
    expect(Location.geocodeAsync).not.toHaveBeenCalled();
  });

  it("returns null when nothing is found or it fails", async () => {
    permission(true);
    jest.mocked(Location.geocodeAsync).mockResolvedValueOnce([]);
    expect(await findCoordinates("Nowhere")).toBeNull();

    jest
      .mocked(Location.geocodeAsync)
      .mockRejectedValueOnce(new Error("offline"));
    expect(await findCoordinates("Lleida")).toBeNull();
  });
});

describe("toPoint", () => {
  it("writes the longitude first, as PostGIS expects", () => {
    expect(toPoint(LLEIDA)).toBe("SRID=4326;POINT(0.62 41.6176)");
  });
});
