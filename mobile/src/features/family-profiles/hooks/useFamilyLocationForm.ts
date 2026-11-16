import { useState } from "react";

import {
  type Coordinates,
  findCoordinates,
  findTown,
  getCurrentCoordinates,
} from "@/lib/location";

import { NO_CURRENT_LOCATION, TOWN_NOT_FOUND } from "../locationErrors";
import { validateFamilyCity } from "../validation";

type UseFamilyLocationFormOptions = {
  initialCity: string | null;
  // Saves the town and its point; it must throw if saving fails
  onSave: (location: {
    city: string;
    coordinates: Coordinates;
  }) => Promise<unknown>;
};

// A town found with the GPS, and the point where the phone was
type GpsFix = { city: string; coordinates: Coordinates };

export function useFamilyLocationForm({
  initialCity,
  onSave,
}: UseFamilyLocationFormOptions) {
  const [city, setCity] = useState(initialCity ?? "");
  const [gpsFix, setGpsFix] = useState<GpsFix | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  // Why the town could not be located; cleared on the next attempt
  const [locationError, setLocationError] = useState<string | null>(null);

  const cityError = submitted ? validateFamilyCity(city) : null;

  // Fills in the town where the phone is now
  async function locate(): Promise<void> {
    setIsLocating(true);
    setLocationError(null);
    try {
      const coordinates = await getCurrentCoordinates();
      const town = coordinates ? await findTown(coordinates) : null;
      if (!coordinates || !town) {
        setLocationError(NO_CURRENT_LOCATION);
        return;
      }
      setCity(town);
      setGpsFix({ city: town, coordinates });
    } finally {
      setIsLocating(false);
    }
  }

  // Returns true when the town has been saved
  async function submit(): Promise<boolean> {
    setSubmitted(true);
    setLocationError(null);
    if (validateFamilyCity(city)) {
      return false;
    }

    const trimmed = city.trim();
    let coordinates = gpsFix?.city === trimmed ? gpsFix.coordinates : null;
    if (!coordinates) {
      setIsFinding(true);
      coordinates = await findCoordinates(trimmed);
      setIsFinding(false);
    }
    if (!coordinates) {
      setLocationError(TOWN_NOT_FOUND);
      return false;
    }

    try {
      await onSave({ city: trimmed, coordinates });
      return true;
    } catch {
      return false;
    }
  }

  return {
    city,
    setCity,
    cityError,
    locationError,
    isLocating,
    isFinding,
    locate,
    submit,
  };
}
