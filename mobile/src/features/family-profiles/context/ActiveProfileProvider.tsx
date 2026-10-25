
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "../../../lib/supabase";
import {
  fetchFamilyProfiles,
} from "../api/familyProfiles";
import { familyProfileKeys } from "../hooks/useFamilyProfiles";
import type { FamilyProfile } from "../types";
import {
  getActiveFamilyProfile,
  getActiveProfileStorageKey,
  sortFamilyProfiles,
} from "../activeProfile";

type ActiveProfileContextValue = {
  activeProfile: FamilyProfile | null;
  activeProfileId: string | null;
  profiles: FamilyProfile[];
  isLoading: boolean;
  isError: boolean;
  setActiveProfile: (profileId: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
};

const ActiveProfileContext =
  createContext<ActiveProfileContextValue | null>(null);

type Props = {
  children: ReactNode;
};

export function ActiveProfileProvider({ children }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [savedSelection, setSavedSelection] = useState<{
    userId: string;
    profileId: string | null;
  } | null>(null);

  // Identify the current customer.
  useEffect(() => {
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;

      setUserId(data.user?.id ?? null);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setUserId(session?.user?.id ?? null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Read family profiles from Supabase.
  // Using familyProfileKeys.all keeps this query included
  // in the invalidations performed by #19 and #20.
  const profilesQuery = useQuery({
    queryKey: [...familyProfileKeys.all, "active-selector", userId],
    queryFn: fetchFamilyProfiles,
    enabled: authReady && Boolean(userId),
  });

  const profiles = useMemo(
    () => sortFamilyProfiles(profilesQuery.data ?? []),
    [profilesQuery.data],
  );

  // Recover the saved choice for the authenticated account.
  useEffect(() => {
    if (!userId) {
        return;
    }

    let cancelled = false;

    async function restoreSelection() {
        try {
        const savedId = await AsyncStorage.getItem(
            getActiveProfileStorageKey(userId!),
        );

        if (!cancelled) {
            setSavedSelection({
            userId: userId!,
            profileId: savedId,
            });
        }
        } catch (error) {
        console.warn(
            "Could not restore active family profile",
            error,
        );

        if (!cancelled) {
            setSavedSelection({
            userId: userId!,
            profileId: null,
            });
        }
        }
    }

    void restoreSelection();

    return () => {
        cancelled = true;
    };
  }, [userId]);


  const storageReady =
    userId !== null && savedSelection?.userId === userId;

  const selectedProfileId = storageReady
    ? savedSelection.profileId
    : null;

  const activeProfile = useMemo(() => {
    if (!storageReady || !profilesQuery.isSuccess) {
      return null;
    }

    return getActiveFamilyProfile(
      profiles,
      selectedProfileId,
    );
  }, [
    storageReady,
    profilesQuery.isSuccess,
    profiles,
    selectedProfileId,
  ]);

  const setActiveProfile = useCallback(
    async (profileId: string) => {
      if (!userId || !storageReady) {
        throw new Error("Active profile is not ready");
      }

      const profileExists = profiles.some(
        (profile) => profile.id === profileId,
      );

      if (!profileExists) {
        throw new Error(
          "This profile does not belong to the current family",
        );
      }

      // Persist the selection before reporting success.
      await AsyncStorage.setItem(
        getActiveProfileStorageKey(userId),
        profileId,
      );

      setSavedSelection({
        userId,
        profileId,
      });
    },
    [userId, storageReady, profiles],
  );

  const { refetch } = profilesQuery;

  const refreshProfiles = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value = useMemo<ActiveProfileContextValue>(
    () => ({
      activeProfile,
      activeProfileId: activeProfile?.id ?? null,
      profiles,
      isLoading:
        !authReady ||
        (userId !== null &&
          (!storageReady || profilesQuery.isPending)),
      isError: profilesQuery.isError,
      setActiveProfile,
      refreshProfiles,
    }),
    [
      activeProfile,
      profiles,
      authReady,
      userId,
      storageReady,
      profilesQuery.isPending,
      profilesQuery.isError,
      setActiveProfile,
      refreshProfiles,
    ],
  );

  return (
    <ActiveProfileContext.Provider value={value}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile() {
  const context = useContext(ActiveProfileContext);

  if (!context) {
    throw new Error(
      "useActiveProfile must be used inside ActiveProfileProvider",
    );
  }

  return context;
}
