import { type Ionicons } from "@expo/vector-icons";
import { type ComponentProps } from "react";

import { type ActivityCategory } from "@/lib/activityCategories";

export const ACTIVITY_IMAGES: Record<ActivityCategory, string> = {
  football:
    "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=900&q=80",
  basketball:
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=80",
  tennis:
    "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80",
  swimming:
    "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=900&q=80",
  dance:
    "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?auto=format&fit=crop&w=900&q=80",
  drama:
    "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80",
  music:
    "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=80",
  language:
    "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=900&q=80",
  art: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=900&q=80",
  tutoring:
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80",
  other:
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80",
};

// Image of a category, or the "other" image for categories added to the
// database after this version of the app
export function activityImage(category: string): string {
  return category in ACTIVITY_IMAGES
    ? ACTIVITY_IMAGES[category as ActivityCategory]
    : ACTIVITY_IMAGES.other;
}

type IconName = ComponentProps<typeof Ionicons>["name"];

export const ACTIVITY_ICONS: Record<ActivityCategory, IconName> = {
  football: "football-outline",
  basketball: "basketball-outline",
  tennis: "tennisball-outline",
  swimming: "water-outline",
  dance: "body-outline",
  drama: "happy-outline",
  music: "musical-notes-outline",
  language: "language-outline",
  art: "color-palette-outline",
  tutoring: "school-outline",
  other: "sparkles-outline",
};

// Icon of a category, or the "other" icon for categories added later
export function activityIcon(category: string): IconName {
  return category in ACTIVITY_ICONS
    ? ACTIVITY_ICONS[category as ActivityCategory]
    : ACTIVITY_ICONS.other;
}

// Soft background and icon colour of the category shortcuts, in turn
export const CATEGORY_TINTS = [
  { background: "#e3f1ec", icon: "#2f7d6b" },
  { background: "#fdf1d6", icon: "#b7791f" },
  { background: "#f9e3e1", icon: "#c0564b" },
  { background: "#e6e9f8", icon: "#4a5bb5" },
] as const;
