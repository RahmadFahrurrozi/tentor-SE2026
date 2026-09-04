import type { EntityType } from "@/hooks/use-entity-detail-table";
import { Building2, Home, Laptop, Layers, Sprout, Store } from "lucide-react";
import React from "react";

export interface EntityTabConfig {
    key: EntityType;
    label: string;
    icon: React.ElementType;
    activeColorClass: string;
    iconColorClass: string;
}

export const ENTITY_TABS: EntityTabConfig[] = [
   {
    key: "all",
    label: "Semua",
    icon: Layers,
    activeColorClass: "bg-primary text-primary-foreground border-primary shadow-xs",
    iconColorClass: "text-inherit",
  },
  {
    key: "usaha",
    label: "Usaha Biasa",
    icon: Store,
    activeColorClass: "bg-amber-500 text-white border-amber-500 shadow-xs",
    iconColorClass: "text-amber-500",
  },
  {
    key: "usaha-digital",
    label: "Digital",
    icon: Laptop,
    activeColorClass: "bg-pink-500 text-white border-pink-500 shadow-xs",
    iconColorClass: "text-pink-500",
  },
  {
    key: "usaha-pertanian",
    label: "Pertanian",
    icon: Sprout,
    activeColorClass: "bg-emerald-600 text-white border-emerald-600 shadow-xs",
    iconColorClass: "text-emerald-500",
  },
  {
    key: "rt",
    label: "KK",
    icon: Home,
    activeColorClass: "bg-blue-600 text-white border-blue-600 shadow-xs",
    iconColorClass: "text-blue-500",
  },
  {
    key: "bangunan",
    label: "Bangunan",
    icon: Building2,
    activeColorClass: "bg-indigo-600 text-white border-indigo-600 shadow-xs",
    iconColorClass: "text-indigo-500",
  },
]