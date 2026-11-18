import { createContext, type ReactNode, useContext } from "react";

// The family profile whose favourites the catalog shows and changes. The
// customer layout provides the active profile, so this feature does not
// import from family-profiles.
const FavouritesProfileContext = createContext<string | null>(null);

type FavouritesProfileProviderProps = {
  // null while there is no profile: nothing can be saved
  profileId: string | null;
  children: ReactNode;
};

export function FavouritesProfileProvider({
  profileId,
  children,
}: Readonly<FavouritesProfileProviderProps>) {
  return (
    <FavouritesProfileContext.Provider value={profileId}>
      {children}
    </FavouritesProfileContext.Provider>
  );
}

export function useFavouritesProfileId(): string | null {
  return useContext(FavouritesProfileContext);
}
