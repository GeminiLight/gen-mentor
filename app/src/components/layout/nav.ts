import { BookOpen, Compass, LibraryBig, Route, TrendingUp, UserRound, type LucideIcon } from "lucide-react";
import type { Key } from "@/lib/i18n";

export interface NavItem {
  href: string;
  label: Key;
  icon: LucideIcon;
  /** Pages that need an active goal are hidden until one exists. */
  needsGoal: boolean;
}

export const NAV: NavItem[] = [
  { href: "/goals", label: "nav.goals", icon: Compass, needsGoal: false },
  { href: "/learning-path", label: "nav.path", icon: Route, needsGoal: true },
  { href: "/library", label: "nav.library", icon: LibraryBig, needsGoal: true },
  { href: "/progress", label: "nav.progress", icon: TrendingUp, needsGoal: true },
  { href: "/profile", label: "nav.profile", icon: UserRound, needsGoal: true },
];

export const SESSION_ICON = BookOpen;
