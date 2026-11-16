import { type Activity } from "@/lib/activity";

import { type ActivityForm } from "../types";

export function toActivityForm(activity: Activity): ActivityForm {
  return {
    title: activity.title,
    description: activity.description ?? "",
    category: activity.category,
    isTutor: activity.isTutor,
    languages: activity.languages,
    type: activity.type,
    startDate: activity.startDate,
    endDate: activity.endDate,
    targetAgeRanges: activity.targetAgeRanges,
    schedule: activity.schedule,
    price: activity.price,
    pricePeriod: activity.pricePeriod,
    maxParticipants: activity.maxParticipants,
    // The database only allows an empty maximum when it is "no limit"
    unlimitedParticipants: activity.maxParticipants === null,
    addressId: activity.addressId,
  };
}
