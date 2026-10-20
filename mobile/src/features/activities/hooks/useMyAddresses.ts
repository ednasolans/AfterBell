import { useQuery } from "@tanstack/react-query";

import { fetchMyAddresses } from "../api/fetchMyAddresses";

// Not under activityKeys: the addresses belong to the provider, not to an activity
export const myAddressesKey = ["addresses", "mine"] as const;

export function useMyAddresses() {
  return useQuery({
    queryKey: myAddressesKey,
    queryFn: fetchMyAddresses,
  });
}
