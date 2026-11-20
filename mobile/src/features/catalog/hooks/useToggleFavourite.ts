import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Alert } from "react-native";

import { addFavourite } from "../api/addFavourite";
import { removeFavourite } from "../api/removeFavourite";
import { toFavouriteErrorMessage } from "../favouriteErrors";
import { useFavouritesProfileId } from "../favouritesProfile";
import {
  type CatalogActivity,
  type CatalogActivityDetail,
  type FavouriteActivity,
} from "../types";
import { catalogKeys } from "./catalogKeys";

export type ToggleFavourite = { activityId: string; save: boolean };

type SearchPages = InfiniteData<CatalogActivity[]>;

// Saves or removes a favourite of the active family profile. The heart changes
// at once in every screen of that profile; if the request fails, the screens go
// back to how they were and an alert says why.
export function useToggleFavourite() {
  const queryClient = useQueryClient();
  const profileId = useFavouritesProfileId();

  return useMutation({
    mutationFn: ({ activityId, save }: ToggleFavourite) => {
      // The heart is not shown without a profile
      if (!profileId) {
        throw new Error("There is no family profile to save favourites for.");
      }
      const target = { familyProfileId: profileId, activityId };
      return save ? addFavourite(target) : removeFavourite(target);
    },

    onMutate: async ({ activityId, save }: ToggleFavourite) => {
      const listKey = catalogKeys.list(profileId);
      const detailKey = catalogKeys.detail(activityId, profileId);
      const favouritesKey = catalogKeys.favourites(profileId);
      const searchesKey = catalogKeys.searches(profileId);

      // A request already on its way would overwrite the change
      await Promise.all(
        [listKey, detailKey, favouritesKey, searchesKey].map((queryKey) =>
          queryClient.cancelQueries({ queryKey }),
        ),
      );

      const previous = {
        list: queryClient.getQueryData<CatalogActivity[]>(listKey),
        detail: queryClient.getQueryData<CatalogActivityDetail | null>(
          detailKey,
        ),
        favourites:
          queryClient.getQueryData<FavouriteActivity[]>(favouritesKey),
        searches: queryClient.getQueriesData<SearchPages>({
          queryKey: searchesKey,
        }),
      };

      queryClient.setQueryData<CatalogActivity[]>(listKey, (items) =>
        items?.map((item) =>
          item.activity.id === activityId
            ? { ...item, isFavourite: save }
            : item,
        ),
      );
      queryClient.setQueriesData<SearchPages>(
        { queryKey: searchesKey },
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) =>
              page.map((item) =>
                item.activity.id === activityId
                  ? { ...item, isFavourite: save }
                  : item,
              ),
            ),
          },
      );
      queryClient.setQueryData<CatalogActivityDetail | null>(
        detailKey,
        (detail) => (detail ? { ...detail, isFavourite: save } : detail),
      );
      // A new favourite needs data the list does not have: it is read again
      // when the request ends. A removed one disappears at once.
      if (!save) {
        queryClient.setQueryData<FavouriteActivity[]>(favouritesKey, (items) =>
          items?.filter((item) => item.activity.id !== activityId),
        );
      }

      return { previous, listKey, detailKey, favouritesKey };
    },

    onError: (error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(context.listKey, context.previous.list);
        queryClient.setQueryData(context.detailKey, context.previous.detail);
        queryClient.setQueryData(
          context.favouritesKey,
          context.previous.favourites,
        );
        for (const [queryKey, data] of context.previous.searches) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      Alert.alert("Favourites", toFavouriteErrorMessage(error));
    },

    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: catalogKeys.favourites(profileId),
      });
    },
  });
}
