"use client";

import { Users, Plus, ShieldCheck, ArrowLeft } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./user/columns";
import { useUsers } from "@/hooks/use-users";
import { useUserForm } from "@/hooks/use-user-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function UsersPage() {
  const { users, isLoading, createUser, isCreating } = useUsers();

  // Custom Hook form isolation
  const { form, onSubmit } = useUserForm((data) => {
    createUser(data);
  });

  return (
    <div className="min-h-screen bg-zinc-50/50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-100/80 rounded-lg border">
              <Users className="size-6 text-zinc-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                User Management
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                Kelola hak akses Petugas Lapangan (PPL/PML) dan Administrator
                Sensus.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-10 px-4 shadow-sm"
              onClick={() => (window.location.href = "http://localhost:8501/")}
            >
              <ArrowLeft className="mr-2 size-4" />
              Dashboard
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="h-10 px-4 bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm">
                  <Plus className="mr-2 size-4" />
                  Tambah Pengguna
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-50 text-green-600 rounded-full mb-4">
                    <ShieldCheck className="size-6" />
                  </div>
                  <DialogTitle className="text-xl">
                    Tambah Petugas Baru
                  </DialogTitle>
                  <DialogDescription>
                    Masukkan informasi identitas pengguna untuk memberikan akses
                    ke portal.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="p-6 pt-2 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">
                      Nama Lengkap
                    </label>
                    <Input
                      placeholder="e.g. Budi Santoso"
                      {...form.register("full_name")}
                      className={`h-11 ${form.formState.errors.full_name ? "border-rose-300 focus-visible:ring-rose-500" : ""}`}
                    />
                    {form.formState.errors.full_name && (
                      <p className="text-[13px] text-rose-500 font-medium">
                        {form.formState.errors.full_name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">
                      Alamat Email
                    </label>
                    <Input
                      type="email"
                      placeholder="e.g. budi@bps.go.id"
                      {...form.register("email")}
                      className={`h-11 ${form.formState.errors.email ? "border-rose-300 focus-visible:ring-rose-500" : ""}`}
                    />
                    {form.formState.errors.email && (
                      <p className="text-[13px] text-rose-500 font-medium">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">
                      Hak Akses (Role)
                    </label>
                    <div className="relative">
                      <select
                        {...form.register("role")}
                        className="w-full h-11 px-3 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none"
                      >
                        <option value="ppl">
                          Petugas Pendataan Lapangan (PPL)
                        </option>
                        <option value="pml">Pengawas Lapangan (PML)</option>
                        <option value="admin">Administrator Sensus</option>
                      </select>
                    </div>
                    {form.formState.errors.role && (
                      <p className="text-[13px] text-rose-500 font-medium">
                        {form.formState.errors.role.message}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      type="submit"
                      className="w-full sm:w-auto h-11"
                      disabled={isCreating}
                    >
                      {isCreating ? "Menyimpan..." : "Simpan Pengguna"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabel Section */}
        <div className="bg-white rounded-xl border shadow-sm p-2 sm:p-6">
          <DataTable columns={columns} data={users} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
