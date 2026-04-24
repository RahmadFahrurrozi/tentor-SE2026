import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Trash2, MoreHorizontal, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type UserType = {
  id: string;
  full_name: string;
  email: string;
  role: "ppl" | "pml" | "admin";
  created_at: string;
  assignments?: string[];
};

export const columns = ({
  onDelete,
  onViewAssignment,
  onEdit,
  regions = [],
}: {
  onDelete: (id: string) => void;
  onViewAssignment: (user: UserType) => void;
  onEdit: (user: UserType) => void;
  regions?: any[];
}): ColumnDef<UserType>[] => [
  {
    accessorKey: "full_name",
    header: "Nama Lengkap",
    cell: ({ row }) => (
      <div className="font-medium text-foreground dark:text-zinc-100">
        {row.getValue("full_name")}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="text-muted-foreground dark:text-zinc-400">
        {row.getValue("email")}
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      const roleConfig = {
        admin: {
          label: "Administrator",
          className: "bg-purple-100 text-purple-700",
        },
        ppl: { label: "PPL", className: "bg-blue-100 text-blue-700" },
        pml: { label: "PML", className: "bg-emerald-100 text-emerald-700" },
      };
      const config =
        roleConfig[role as keyof typeof roleConfig] || roleConfig.ppl;

      return (
        <span
          className={`px-2 py-1 rounded-lg text-xs font-medium ${config.className}`}
        >
          {config.label}
        </span>
      );
    },
  },
  {
    accessorKey: "assignments",
    header: "Wilayah Tugas",
    cell: ({ row }) => {
      const user = row.original;
      const assignments = user.assignments || [];

      if (user.role === "admin") {
        return (
          <div className="text-muted-foreground text-xs italic">
            Seluruh Wilayah
          </div>
        );
      }

      // Map IDs to Names
      const names = assignments.map((id) => {
        const region = regions.find((r) => r.iddesa === id || r.idkec === id);
        return region
          ? user.role === "ppl"
            ? region.nmdesa
            : region.nmkec
          : id;
      });

      const displaySummary =
        names.length > 2
          ? `${names.slice(0, 2).join(", ")} +${names.length - 2} lainnya`
          : names.join(", ");

      return (
        <div className="flex flex-col gap-1.5 items-start">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewAssignment(user)}
              className="text-indigo-600 hover:text-indigo-700 text-[10px] font-bold bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1.5"
            >
              {assignments.length} {user.role === "pml" ? "Kec" : "Desa"}
            </button>
          </div>
          <span
            className="text-[10px] flex items-center gap-1 text-muted-foreground font-normal leading-tight max-w-[150px] truncate pl-0.5"
            title={names.join(", ")}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
            </span>
            {displaySummary}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Dibuat Pada",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return (
        <div className="text-muted-foreground text-sm">
          {date.toLocaleDateString("id-ID")}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Aksi",
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onDelete(user.id)}
              className="text-rose-600 focus:text-rose-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEdit(user)}
              className="text-slate-900 focus:text-slate-900"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Ubah
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
