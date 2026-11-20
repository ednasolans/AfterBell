# Feature guide: location of families and addresses (#139)

Recommendations by distance (C7, #105–#108) need to know where each family lives and where each activity takes place. This issue stores that data and lets families enter their town. Using it in `recommend_activities` belongs to C7.

## 1. Decisions

| Decision | Alternatives considered | Why |
|---|---|---|
| **The location belongs to the family group** (`family_groups.city`, `family_groups.location`) | Each family profile / each account | A family lives in one place, shared by every member of the group. Family profiles are about minors: nothing is added to them. |
| **The family point is blurred to a grid of 0.015°** (about 1.7 km × 1.3 km in Spain) by `set_family_location` | The exact GPS position / only the town | Enough for "activities near you", never the home address (team decision: "1–2 km around"). It is done in the database, so no client can store a more precise point. |
| **The town is stored too** | Only the point | It is what the family sees and edits, and C7 can still compare by city for addresses without a point. |
| **Addresses of providers get their exact point** (`addresses.location`) | No point / blurred | Addresses are public: customers already see them in the activity detail. |
| **Geocoding happens on the phone with `expo-location`** | An Edge Function with Nominatim or Google | Free, no keys, works in Expo Go. On Android, geocoding needs the location permission, so the provider is asked for it when saving the sheet; if it is denied, the address is saved without a point. |
| **PostGIS `geography(Point, 4326)`** | Two `double precision` columns | Real distances in metres (`ST_Distance`, `ST_DWithin`) and a GIST index on the addresses. |
| **Families write their location only through `set_family_location`** | `GRANT UPDATE` on `family_groups` | The function checks the caller, validates the town and the point, and blurs it. Members can still read their group. |

## 2. Database

Migration `20261116120000_add_family_and_address_locations.sql`:

- `CREATE EXTENSION postgis WITH SCHEMA extensions`.
- `addresses.location geography(Point, 4326)`, optional, GIST index, `GRANT INSERT, UPDATE (location)`. The app sends it as text: `SRID=4326;POINT(longitude latitude)` (longitude first).
- `family_groups.city` (not blank, max 100) and `family_groups.location` (only with a city).
- `set_family_location(p_city, p_latitude, p_longitude)`:

| Message | When |
|---|---|
| `Only family accounts can save a location` | The caller has no family group (providers) |
| `Enter your city or town` | Blank town |
| `The city name is too long` | More than 100 characters |
| `The location is not valid` | Missing or out-of-range point |

### For C7: distance from a family to its activities

```sql
SELECT a.*, extensions.ST_Distance(fg.location, ad.location) AS distance_m
FROM public.activities a
JOIN public.addresses ad ON ad.id = a.address_id
JOIN public.family_groups fg ON public.is_family_member(fg.id)
WHERE a.status = 'published'
  AND extensions.ST_DWithin(fg.location, ad.location, 15000)  -- 15 km
ORDER BY distance_m;
```

Addresses saved before #139, or that could not be geocoded, have no point: compare them by city (`lower(ad.city) = lower(fg.city)`).

## 3. App

| File | What it does |
|---|---|
| `lib/location.ts` | `Coordinates`; `getCurrentCoordinates` (permission + low accuracy), `findTown` (reverse geocoding), `findCoordinates` (geocoding), `toPoint`. Every failure returns `null`. |
| `lib/addresses.ts` | `addressSearchText(form)` and `toAddressInsert(form, coordinates)` |
| `features/technical-sheet/api/saveTechnicalSheet.ts` | Geocodes each address before saving it, one after the other (one permission prompt) |
| `features/family-profiles/api/familyLocation.ts` | `fetchFamilyCity`, `saveFamilyLocation` |
| `features/family-profiles/hooks/useFamilyLocation.ts` | Query and mutation (`["family-profiles", "location"]`) |
| `features/family-profiles/hooks/useFamilyLocationForm.ts` | The town, *Use my current location*, and which point to save |
| `features/family-profiles/components/FamilyLocationCard.tsx` | *Your location* card at the top of **Family profiles** |

**Which point is saved:** if the town came from *Use my current location* and was not changed, the point of the phone (blurred by the database); if it was typed, the point of the town found by geocoding. If the town cannot be found, the family sees "We could not find this town…" and nothing is saved.

`expo-location` is a new dependency (`~58.0.22`, included in Expo Go), with its config plugin and the iOS permission text in `app.json`.

## 4. How to test

- `supabase/tests/locations.sql` (23 checks, rolled back): saving, the blurred point (never more than ~1 km away), validation and limits, another family cannot read or change it, providers and anonymous users cannot save, addresses with and without a point, and a distance in km.
  `docker exec -i supabase_db_AfterBell psql -U postgres -d postgres < supabase/tests/locations.sql`
- Jest: `lib/location.test.ts`, `lib/addresses.test.ts`, `saveTechnicalSheet.test.ts`, and in `family-profiles`: `familyLocation.test.ts`, `locationErrors.test.ts`, `validation.test.ts`, `useFamilyLocationForm.test.ts`, `FamilyLocationCard.test.tsx`, `FamilyProfilesList.test.tsx`.
- On a phone: **Family profiles** → *Add your town* → *Use my current location* (accept the permission) → *Save*. In Studio, `family_groups.location` is a point near you, not your exact position.

## 5. Pending

- `recommend_activities` (#106) uses `family_groups.location` and `addresses.location` to order by distance: see [recommendations.md](recommendations.md).
- Addresses saved before this issue have no point. They get one when they are saved again (editing addresses does not exist yet), or with a one-off script.
