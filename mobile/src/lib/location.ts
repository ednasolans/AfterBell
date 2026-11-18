import * as Location from "expo-location";

// A point on the map. The app never stores the whole LocationObject of
// expo-location: it has the exact position, the altitude, the speed…
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Asks for permission and returns where the phone is, with an accuracy of
// about 1 km: enough to find the town, and it is faster and uses less battery.
// Null when the user says no or the position cannot be read.
export async function getCurrentCoordinates(): Promise<Coordinates | null> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) {
      return null;
    }
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    return { latitude: coords.latitude, longitude: coords.longitude };
  } catch {
    return null;
  }
}

// Name of the town of a point, or null if it cannot be found
export async function findTown(
  coordinates: Coordinates,
): Promise<string | null> {
  try {
    const [place] = await Location.reverseGeocodeAsync(coordinates);
    // Small villages sometimes have no city, only the area they belong to
    return place?.city ?? place?.subregion ?? null;
  } catch {
    return null;
  }
}

// Point of an address or a town, or null if it cannot be found. Android needs
// the location permission to geocode, so it is asked for here.
export async function findCoordinates(
  text: string,
): Promise<Coordinates | null> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) {
      return null;
    }
    const [place] = await Location.geocodeAsync(text);
    return place
      ? { latitude: place.latitude, longitude: place.longitude }
      : null;
  } catch {
    return null;
  }
}

// The text Supabase accepts for a geography(Point, 4326) column.
// PostGIS writes the longitude first.
export function toPoint({ latitude, longitude }: Coordinates): string {
  return `SRID=4326;POINT(${longitude} ${latitude})`;
}
