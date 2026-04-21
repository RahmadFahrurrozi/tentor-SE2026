"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Plus,
  ShieldCheck,
  ArrowLeft,
  Upload,
  RefreshCw,
  UserLock,
  Map as MapIcon,
  MapPin,
  Search,
  Check,
  X,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./user/columns";
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
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/services/auth.service";
import { toast } from "sonner";
import { useUsersQuery } from "@/hooks/use-users";
import {
  type CreateUserPayload,
  type BulkUploadResult,
  userService,
  type Region,
} from "@/services/user.service";
import { BulkUploadModal } from "@/components/bulk-opload-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import AssignmentMap from "@/components/user/AssignmentMap";

export default function UsersPage() {
  const [page, setPage] = useState(0);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ processed: 0, total: 0 });
  const [regions, setRegions] = useState<Region[]>([]);
  const [viewingUserAssignment, setViewingUserAssignment] = useState<
    any | null
  >(null);
  const [assignmentSearch, setAssignmentSearch] = useState("");

  useEffect(() => {
    userService
      .getMasterRegions()
      .then(setRegions)
      .catch((err) => {
        console.error("Gagal memuat data wilayah:", err);
        toast.error("Gagal memuat data wilayah.");
      });
  }, []);

  const { user } = useAuthStore();
  const {
    users,
    total,
    totalPages,
    isLoading,
    isFetching,
    createUser,
    isCreating,
    bulkCreateUsers,
    isBulkUploading,
    deleteUser,
    refetch,
  } = useUsersQuery(page, 10);

  const { form, onSubmit } = useUserForm((data) => {
    createUser(data);
  });

  const selectedRole = form.watch("role") || "ppl";
  const selectedAssignments = form.watch("assignments") || [];

  const availableRegions = useMemo(() => {
    const role = selectedRole.toLowerCase();
    if (role === "ppl") {
      return regions.map((r) => ({
        label: `${r.nmdesa} (${r.nmkec})`,
        value: r.iddesa,
      }));
    } else {
      const keks = Array.from(
        new Set(
          regions.map((r) => JSON.stringify({ name: r.nmkec, id: r.idkec })),
        ),
      );
      return keks.map((k) => {
        const parsed = JSON.parse(k);
        return { label: parsed.name, value: parsed.id };
      });
    }
  }, [regions, selectedRole]);

  const toggleAssignment = (value: string) => {
    const current = [...selectedAssignments];
    const index = current.indexOf(value);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(value);
    }
    form.setValue("assignments", current);
  };

  const handleBackToDashboard = async () => {
    if (!user?.id) return;
    try {
      const token = await authService.generateOtc(user.id);
      window.location.href = `${import.meta.env.VITE_STREAMLIT_URL ?? "http://localhost:8501"}?code=${token}`;
    } catch {
      toast.error("Gagal redirect ke dashboard.");
    }
  };

  const handleBulkUpload = (
    users: CreateUserPayload[],
  ): Promise<BulkUploadResult> => {
    return new Promise((resolve, reject) => {
      bulkCreateUsers(
        {
          users,
          onProgress: (processed, total) => {
            setBulkProgress({ processed, total });
          },
        },
        {
          onSuccess: (result) => {
            setBulkProgress({ processed: 0, total: 0 });
            resolve(result as BulkUploadResult);
          },
          onError: (error) => {
            setBulkProgress({ processed: 0, total: 0 });
            reject(error);
          },
        },
      );
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="border border-stone-200 p-2.5">
                <Users className="size-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-2xl font-light text-stone-900 tracking-tight">
                  User Management
                </h1>
                <p className="text-sm text-stone-400 mt-0.5">
                  Kelola hak akses Petugas Lapangan dan Administrator
                </p>
                {isFetching && (
                  <p className="text-xs text-stone-400 mt-1">Memperbarui...</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={handleBackToDashboard}
                className="text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-md h-9 px-3 text-sm font-normal"
              >
                <ArrowLeft className="mr-2 size-3.5" strokeWidth={1.5} />
                Dashboard
              </Button>

              <Button
                variant="ghost"
                onClick={() => refetch()}
                disabled={isFetching}
                className="text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-md h-9 px-3 text-sm font-normal"
              >
                <RefreshCw
                  className={`mr-2 size-3.5 ${isFetching ? "animate-spin" : ""}`}
                  strokeWidth={1.5}
                />
                Refresh
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsBulkModalOpen(true)}
                className="border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300 rounded-md h-9 px-3 text-sm font-normal"
              >
                <Upload className="mr-2 size-3.5" strokeWidth={1.5} />
                Import
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-white rounded-md h-9 px-4 text-sm font-normal">
                    <Plus className="mr-2 size-3.5" strokeWidth={1.5} />
                    Tambah Pengguna
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] border-stone-200 rounded-md p-0">
                  <DialogHeader className="p-6 pb-2">
                    <div className="border border-stone-200 w-10 h-10 flex items-center justify-center mb-4">
                      <UserLock
                        className="size-5 text-primary"
                        strokeWidth={1.5}
                      />
                    </div>
                    <DialogTitle className="text-xl font-light tracking-tight">
                      Tambah Petugas Baru
                    </DialogTitle>
                    <DialogDescription className="text-stone-400 text-sm">
                      Masukkan informasi identitas pengguna
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={onSubmit} className="px-6 pb-6 space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-stone-600 uppercase tracking-wide">
                        Nama Lengkap
                      </label>
                      <Input
                        placeholder="Budi Santoso"
                        {...form.register("full_name")}
                        className="rounded-md border-stone-200 focus:border-primary focus:ring-0 h-10 text-sm"
                      />
                      {form.formState.errors.full_name && (
                        <p className="text-xs text-red-500">
                          {form.formState.errors.full_name.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-stone-600 uppercase tracking-wide">
                        Alamat Email
                      </label>
                      <Input
                        type="email"
                        placeholder="budi@bps.go.id"
                        {...form.register("email")}
                        className="rounded-md border-stone-200 focus:border-primary focus:ring-0 h-10 text-sm"
                      />
                      {form.formState.errors.email && (
                        <p className="text-xs text-red-500">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-stone-600 uppercase tracking-wide">
                        Hak Akses
                      </label>
                      <select
                        {...form.register("role")}
                        className="w-full h-10 px-3 text-sm rounded-md border border-stone-200 bg-white focus:outline-none focus:border-primary"
                      >
                        <option value="" disabled>
                          Pilih Hak Akses
                        </option>
                        <option value="ppl">
                          Petugas Pendataan Lapangan (PPL)
                        </option>
                        <option value="pml">Pengawas Lapangan (PML)</option>
                        <option value="admin">Administrator Sensus</option>
                      </select>
                      {form.formState.errors.role && (
                        <p className="text-xs text-red-500">
                          {form.formState.errors.role.message}
                        </p>
                      )}
                    </div>

                    {(selectedRole === "ppl" || selectedRole === "pml") && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-stone-600 uppercase tracking-wide flex justify-between items-center">
                          <span>
                            Wilayah Penugasan ({selectedRole.toUpperCase()})
                          </span>
                          <span className="text-[10px] text-stone-400 normal-case font-normal italic">
                            Dipilih: {selectedAssignments.length}
                          </span>
                        </label>

                        <div className="relative mb-2">
                          <Search className="absolute left-2.5 top-2.5 size-3.5 text-stone-400" />
                          <Input
                            placeholder={`Cari ${selectedRole === "pml" ? "Kecamatan" : "Desa"}...`}
                            value={assignmentSearch}
                            onChange={(e) =>
                              setAssignmentSearch(e.target.value)
                            }
                            className="h-9 pl-8 text-xs border-stone-100 bg-stone-50/50"
                          />
                        </div>

                        <div className="border border-stone-100 rounded-md p-1 bg-stone-50/30 max-h-[160px] overflow-y-auto custom-scrollbar">
                          <div className="grid grid-cols-1 gap-0.5">
                            {availableRegions
                              .filter((r) =>
                                r.label
                                  .toLowerCase()
                                  .includes(assignmentSearch.toLowerCase()),
                              )
                              .map((region) => (
                                <div
                                  key={region.value}
                                  onClick={() => toggleAssignment(region.value)}
                                  className={cn(
                                    "flex items-center gap-2 p-2 hover:bg-stone-100/50 rounded cursor-pointer transition-colors group",
                                    selectedAssignments.includes(
                                      region.value,
                                    ) &&
                                      "bg-white border border-stone-200 shadow-sm",
                                  )}
                                >
                                  <div
                                    className="flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Checkbox
                                      checked={selectedAssignments.includes(
                                        region.value,
                                      )}
                                      onCheckedChange={() =>
                                        toggleAssignment(region.value)
                                      }
                                    />
                                  </div>
                                  <span className="text-xs text-stone-700 select-none">
                                    {region.label}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 rounded-md h-10 text-sm font-normal"
                      disabled={isCreating}
                    >
                      {isCreating ? "Menyimpan..." : "Simpan Pengguna"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="border border-stone-200 rounded-md">
          <div className="p-6">
            <DataTable
              columns={columns({
                onDelete: deleteUser,
                onViewAssignment: (user) => setViewingUserAssignment(user),
                regions: regions,
              })}
              data={users}
              isLoading={isLoading}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-6 border-t border-stone-200">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isFetching}
                  className="rounded-md border-stone-200 text-stone-600 hover:bg-stone-50 h-8 px-3 text-sm font-normal"
                >
                  Previous
                </Button>
                <span className="text-sm text-stone-400">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page === totalPages - 1 || isFetching}
                  className="rounded-md border-stone-200 text-stone-600 hover:bg-stone-50 h-8 px-3 text-sm font-normal"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => {
          setIsBulkModalOpen(false);
          setBulkProgress({ processed: 0, total: 0 });
        }}
        onUpload={handleBulkUpload}
        isUploading={isBulkUploading}
        progress={bulkProgress}
      />

      {/* View Assignment Modal */}
      <Dialog
        open={!!viewingUserAssignment}
        onOpenChange={(open) => !open && setViewingUserAssignment(null)}
      >
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-stone-200">
          <DialogHeader className="p-6 pb-4 bg-stone-50/50 border-b border-stone-100">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-md">
                  <MapIcon
                    className="size-5 text-indigo-600"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <DialogTitle className="text-xl font-light tracking-tight">
                    Wilayah Penugasan
                  </DialogTitle>
                  <DialogDescription className="text-stone-400 text-sm">
                    {viewingUserAssignment?.full_name} •{" "}
                    {viewingUserAssignment?.role.toUpperCase()}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col">
            {/* List Info dengan Grid */}
            <div className="border-b border-stone-100 p-6">
              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                Daftar Wilayah (
                {viewingUserAssignment?.assignments?.length || 0})
              </h4>

              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {viewingUserAssignment?.assignments?.map((id) => {
                  const region = regions.find(
                    (r) => r.iddesa === id || r.idkec === id,
                  );
                  const displayName = region
                    ? viewingUserAssignment.role.toLowerCase() === "ppl"
                      ? region.nmdesa
                      : region.nmkec
                    : id;

                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 rounded-md border border-stone-200"
                    >
                      <MapPin
                        className="size-3 text-indigo-400 flex-shrink-0"
                        strokeWidth={1.5}
                      />
                      <span className="text-xs text-stone-700 font-medium truncate">
                        {displayName}
                      </span>
                    </div>
                  );
                })}
                {(!viewingUserAssignment?.assignments ||
                  viewingUserAssignment.assignments.length === 0) && (
                  <p className="text-xs text-stone-400 italic col-span-2">
                    Tidak ada wilayah ditentukan.
                  </p>
                )}
              </div>
            </div>

            {/* Map Area */}
            <div className="h-[400px] bg-stone-100 relative overflow-hidden">
              {viewingUserAssignment && (
                <AssignmentMap
                  assignments={viewingUserAssignment.assignments || []}
                  role={viewingUserAssignment.role}
                />
              )}

              <div className="absolute top-4 right-4 z-10 pointer-events-none">
                <Badge
                  variant="outline"
                  className="bg-white/80 backdrop-blur-sm border-stone-200 text-stone-600 font-normal"
                >
                  Interactive Map
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-4 bg-stone-50/50 border-t border-stone-100 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setViewingUserAssignment(null)}
              className="rounded-md h-9 text-sm font-normal"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
