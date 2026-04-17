"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  ArrowUpDown,
  Trash2,
  KeyRound,
  Edit,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type UserType = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "ppl" | "pml";
  created_at?: string;
};

export const columns: ColumnDef<UserType>[] = [
  {
    accessorKey: "full_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="font-semibold"
        >
          Nama Lengkap
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      const getBadgeVariant = (role: string) => {
        switch (role) {
          case "admin":
            return "bg-rose-100 text-rose-800 hover:bg-rose-100/80";
          case "pml":
            return "bg-amber-100 text-amber-800 hover:bg-amber-100/80";
          case "ppl":
            return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80";
          default:
            return "bg-zinc-100 text-zinc-800";
        }
      };

      return (
        <span
          className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getBadgeVariant(role)}`}
        >
          {role.toUpperCase()}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.id)}
            >
              Copy User ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-zinc-600">
              <Edit className="mr-2 h-4 w-4" /> Edit Detail
            </DropdownMenuItem>
            <DropdownMenuItem className="text-amber-600">
              <KeyRound className="mr-2 h-4 w-4" /> Reset Password
            </DropdownMenuItem>
            <DropdownMenuItem className="text-rose-600 focus:text-rose-600">
              <Trash2 className="mr-2 h-4 w-4" /> Hapus Akun
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
