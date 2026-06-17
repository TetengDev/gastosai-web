import {
  Briefcase,
  Car,
  Coffee,
  CreditCard,
  Droplets,
  Dumbbell,
  Film,
  Gift,
  Globe,
  GraduationCap,
  Heart,
  Home,
  Monitor,
  Music,
  Package,
  Phone,
  Plane,
  ShoppingBag,
  Sparkles,
  Tag,
  Utensils,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Icons a user can explicitly pick for a category (keyed by name). */
export const AVAILABLE_ICONS: Record<string, LucideIcon> = {
  Briefcase, Car, Coffee, CreditCard, Droplets, Dumbbell, Film, Gift, Globe,
  GraduationCap, Heart, Home, Monitor, Music, Package, Phone, Plane,
  ShoppingBag, Sparkles, Tag, Utensils, Users, Wallet, Zap,
};

/** Sensible default icon per predefined category name. */
export const CATEGORY_NAME_ICON_MAP: Record<string, LucideIcon> = {
  "Cleaning Essentials": Sparkles,
  "Date": Heart,
  "Extras": Package,
  "Family Contributions": Users,
  "Hygiene Essentials": Droplets,
  "Meal Plan": Utensils,
  "Monthly Personal": Wallet,
  "Monthly Utilities": Zap,
  "Training/Upskilling": GraduationCap,
  "Transaction Fees": CreditCard,
  "Transportation": Car,
  "Uncategorized": Tag,
  "Vacation": Plane,
};

/**
 * Resolve the icon for a category: the user's picked icon if known, else the
 * predefined-name default, else a generic Tag.
 */
export function categoryIcon(name: string, iconKey?: string | null): LucideIcon {
  if (iconKey && iconKey in AVAILABLE_ICONS) return AVAILABLE_ICONS[iconKey];
  return CATEGORY_NAME_ICON_MAP[name] ?? Tag;
}
