import { BookOpen, Compass, LibraryBig, Route, TrendingUp, UserRound, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Pages that need an active goal are hidden until one exists. */
  needsGoal: boolean;
}

export const NAV: NavItem[] = [
  { href: "/goals", label: "Goals", icon: Compass, needsGoal: false },
  { href: "/learning-path", label: "Path", icon: Route, needsGoal: true },
  { href: "/library", label: "Library", icon: LibraryBig, needsGoal: true },
  { href: "/progress", label: "Progress", icon: TrendingUp, needsGoal: true },
  { href: "/profile", label: "Profile", icon: UserRound, needsGoal: true },
];

export const SESSION_ICON = BookOpen;
