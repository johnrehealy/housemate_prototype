import {
  Basket,
  Buildings,
  CalendarBlank,
  Chat,
  ListChecks,
  Wrench,
  type Icon,
} from "@phosphor-icons/react";

export type Destination = {
  href: string;
  label: string;
  icon: Icon;
};

// Order and glyphs from docs/design.md §3 Iconography.
export const DESTINATIONS: readonly Destination[] = [
  { href: "/chat", label: "Chat", icon: Chat },
  { href: "/todo", label: "To do", icon: ListChecks },
  { href: "/schedule", label: "Schedule", icon: CalendarBlank },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/errands", label: "Errands", icon: Basket },
  { href: "/property", label: "Property", icon: Buildings },
];
