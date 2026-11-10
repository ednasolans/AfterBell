import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

import { addFavourite } from "../api/addFavourite";
import { removeFavourite } from "../api/removeFavourite";
import { toFavouriteErrorMessage } from "../favouriteErrors";
import {
  type CatalogActivity,
  type CatalogActivityDetail,
  type FavouriteActivity,
} from "../types";
import { catalogKeys } from "./catalogKeys";

export type ToggleFavourite = { activityId: string; save: boolean };

// Saves or removes a favourite. The heart changes at once in every screen; if
// the request fails, the screens go back to how they were and an alert says why.
export function useToggleFavourite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ activityId, save }: ToggleFavourite) =>
      save ? addFavourite(activityId) : removeFavourite(activityId),

    onMutate: async ({ activityId, save }: ToggleFavourite) => {
      const listKey = catalogKeys.list();
      const detailKey = catalogKeys.detail(activityId);
      const favouritesKey = catalogKeys.favourites();

      // A request already on its way would overwrite the change
      await Promise.all(
        [listKey, detailKey, favouritesKey].map((queryKey) =>
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
      };

      queryClient.setQueryData<CatalogActivity[]>(listKey, (items) =>
        items?.map((item) =>
          item.activity.id === activityId
            ? { ...item, isFavourite: save }
            : item,
        ),
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
      }
      Alert.alert("Favourites", toFavouriteErrorMessage(error));
    },

    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: catalogKeys.favourites(),
      });
    },
  });
}
