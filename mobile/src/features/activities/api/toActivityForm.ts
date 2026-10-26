import { type Activity } from "@/lib/activity";

import { type ActivityForm } from "../types";

export function toActivityForm(activity: Activity): ActivityForm {
  return {
    title: activity.title,
    description: activity.description ?? "",
    category: activity.category,
    type: activity.type,
    targetAgeRanges: activity.targetAgeRanges,
    schedule: activity.schedule,
    price: activity.price,
    pricePeriod: activity.pricePeriod,
    maxParticipants: activity.maxParticipants,
    addressId: activity.addressId,
  };
}
