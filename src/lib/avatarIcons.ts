import {
  Bird,
  Bot,
  Cat,
  Coffee,
  Crown,
  Dog,
  Fish,
  Flower2,
  Gamepad2,
  Ghost,
  Heart,
  Leaf,
  Music,
  Rocket,
  Smile,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Bundled avatar icon set (offline, no external calls). Keyed by name. */
export const AVATAR_ICONS: Record<string, LucideIcon> = {
  User, Smile, Cat, Dog, Bird, Fish, Ghost, Bot, Rocket, Crown,
  Leaf, Flower2, Coffee, Gamepad2, Music, Heart, Sparkles, Zap,
};

export const AVATAR_ICON_KEYS = Object.keys(AVATAR_ICONS);

/** The icon for a saved avatar key, or null when unset/unknown (caller falls back to initials). */
export function avatarIconFor(key?: string | null): LucideIcon | null {
  return key && key in AVATAR_ICONS ? AVATAR_ICONS[key] : null;
}
