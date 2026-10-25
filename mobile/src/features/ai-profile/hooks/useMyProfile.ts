import { useQuery } from "@tanstack/react-query";

import { fetchMyProfile } from "../api/fetchMyProfile";
import { profileKeys } from "./profileKeys";

export function useMyProfile() {
  return useQuery({
    queryKey: profileKeys.mine(),
    queryFn: fetchMyProfile,
  });
}
