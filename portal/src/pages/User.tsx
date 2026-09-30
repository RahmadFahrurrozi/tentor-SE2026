import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Plus,
  ArrowLeft,
  Upload,
  RefreshCw,
  UserLock,
  Map as MapIcon,
  MapPin,
  Search,
  Pen,
  HardDrive,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { ModeToggle } from "@/components/ui/mode-toggle";

export default function UsersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ processed: 0, total: 0 });
  const [regions, setRegions] = useState<Region[]>([]);
  const [viewingUserAssignment, setViewingUserAssignment] = useState<
    any | null
  >(null);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  useEffect(() => {
    userService
      .getMasterRegions()
      .then(setRegions)
      .catch((err) => {
        console.error("Gagal memuat data wilayah:", err);
        toast.error("Gagal memuat data wilayah.");
      });
  }, []);

  // const { user } = useAuthStore();
  const {
    users,
    totalPages,
    isLoading,
    isFetching,
    createUser,
    isCreating,
    bulkCreateUsers,
    isBulkUploading,
    deleteUser,
    updateUser,
    isUpdating,
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

  // Form for Editing
  const { form: editForm, onSubmit: onEditSubmit } = useUserForm((data) => {
    if (editingUser) {
      updateUser({ id: editingUser.id, data });
      setEditingUser(null);
    }
  });

  const editSelectedRole = editForm.watch("role") || "ppl";
  const editSelectedAssignments = editForm.watch("assignments") || [];

  const editAvailableRegions = useMemo(() => {
    const role = editSelectedRole.toLowerCase();
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
  }, [regions, editSelectedRole]);

  useEffect(() => {
    if (editingUser) {
      editForm.reset({
        full_name: editingUser.full_name,
        email: editingUser.email,
        role: editingUser.role,
        assignments: editingUser.assignments || [],
      });
    }
  }, [editingUser, editForm]);

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
    navigate("/dashboard");
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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="border dark:border-zinc-600 p-2.5">
                <Users className="size-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-2xl font-light text-foreground tracking-tight">
                  User Management
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Kelola hak akses Petugas Lapangan dan Administrator
                </p>
                {isFetching && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Memperbarui...
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto mt-6 lg:mt-0">
              <Button
                variant="ghost"
                onClick={handleBackToDashboard}
                className="flex-1 lg:flex-none border-stone-600 text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:border-stone-700 hover:bg-stone-50 hover:border-stone-300 rounded-md h-9 px-3 text-sm font-normal"
              >
                <ArrowLeft className="mr-2 size-3.5" strokeWidth={1.5} />
                Dashboard
              </Button>

              <Button
                variant="ghost"
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex-1 lg:flex-none border-stone-600 text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:border-stone-700 hover:bg-stone-50 hover:border-stone-300 rounded-md h-9 px-3 text-sm font-normal"
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
                className="flex-1 lg:flex-none border-stone-200 text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:border-stone-700 hover:bg-stone-50 hover:border-stone-300 rounded-md h-9 px-3 text-sm font-normal"
              >
                <Upload className="mr-2 size-3.5" strokeWidth={1.5} />
                Import
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate("/upload")}
                className="flex-1 lg:flex-none border-indigo-200 text-indigo-700 dark:text-indigo-400 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md h-9 px-3 text-sm font-medium"
              >
                <HardDrive className="mr-2 size-3.5" strokeWidth={1.5} />
                Upload Data
              </Button>

              <ModeToggle />

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full lg:w-auto bg-primary hover:bg-primary/90 text-white rounded-md h-9 px-4 text-sm font-normal">
                    <Plus className="mr-2 size-3.5" strokeWidth={1.5} />
                    Tambah Pengguna
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] border-border dark:border-zinc-800 rounded-md p-0">
                  <DialogHeader className="p-6 pb-2">
                    <div className="border border-border dark:border-zinc-700 w-10 h-10 flex items-center justify-center mb-4">
                      <UserLock
                        className="size-5 text-primary"
                        strokeWidth={1.5}
                      />
                    </div>
                    <DialogTitle className="text-xl font-light tracking-tight">
                      Tambah Petugas Baru
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-sm">
                      Masukkan informasi identitas pengguna
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={onSubmit} className="px-6 pb-6 space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground dark:text-zinc-400 uppercase tracking-wide">
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
                      <label className="text-xs font-medium text-muted-foreground dark:text-zinc-400 uppercase tracking-wide">
                        Alamat Email
                      </label>
                      <Input
                        type="email"
                        placeholder="budi@bps.go.id"
                        {...form.register("email")}
                        className="rounded-md border-border dark:border-zinc-700 bg-background focus:border-primary focus:ring-0 h-10 text-sm"
                      />
                      {form.formState.errors.email && (
                        <p className="text-xs text-red-500">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground dark:text-zinc-400 uppercase tracking-wide">
                        Hak Akses
                      </label>
                      <select
                        {...form.register("role")}
                        className="w-full h-10 px-3 text-sm rounded-md border border-border dark:border-zinc-700 bg-background dark:text-zinc-100 focus:outline-none focus:border-primary"
                      >
                        <option value="" disabled>
                          Pilih Hak Akses
                        </option>
                        <option value="ppl">
                          Petugas Pendataan Lapangan (PPL)
                        </option>
                        <option value="pml">Pengawas Lapangan (PML)</option>
                        <option value="pengolahan">
                          Petugas Pengolahan Peta (Banyuwangi)
                        </option>
                        <option disabled value="admin">
                          Administrator Sensus
                        </option>
                      </select>
                      {form.formState.errors.role && (
                        <p className="text-xs text-red-500">
                          {form.formState.errors.role.message}
                        </p>
                      )}
                    </div>

                    {(selectedRole === "ppl" || selectedRole === "pml") && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground dark:text-zinc-400 uppercase tracking-wide flex justify-between items-center">
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

                        <div className="border border-stone-100 rounded-md p-1 bg-stone-50/30 dark:bg-zinc-800 dark:border-zinc-600 max-h-[160px] overflow-y-auto custom-scrollbar">
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
                                    "flex items-center gap-2 p-2 hover:bg-stone-100/50 dark:hover:bg-zinc-700/50 rounded cursor-pointer transition-colors group",
                                    selectedAssignments.includes(
                                      region.value,
                                    ) &&
                                      "bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 shadow-sm",
                                  )}
                                >
                                  <div
                                    className="shrink-0"
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
                                  <span className="text-xs text-foreground select-none">
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
        <div className="border rounded-md">
          <div className="p-6">
            <DataTable
              columns={columns({
                onDelete: (id) => {
                  const u = users.find((user) => user.id === id);
                  setUserToDelete(u);
                },
                onEdit: (user) => setEditingUser(user),
                onViewAssignment: (user) => setViewingUserAssignment(user),
                regions: regions,
              })}
              data={users}
              isLoading={isLoading}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-6 border-t border-stone-200 dark:border-zinc-800">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isFetching}
                  className="rounded-md border-stone-200 text-stone-600 dark:text-stone-400 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800 h-8 px-3 text-sm font-normal"
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
                  className="rounded-md border-stone-200 text-stone-600 dark:text-stone-400 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800 h-8 px-3 text-sm font-normal"
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
                {viewingUserAssignment?.assignments?.map((id: string) => {
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
                        className="size-3 text-indigo-400 shrink-0"
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <DialogContent className="sm:max-w-[400px] border-stone-200 rounded-md p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-rose-600">
              Konfirmasi Hapus
            </DialogTitle>
            <DialogDescription className="text-stone-500 mt-2">
              Apakah Anda yakin ingin menghapus pengguna{" "}
              <span className="font-semibold text-stone-900">
                {userToDelete?.full_name}
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="ghost"
              onClick={() => setUserToDelete(null)}
              className="text-stone-500 hover:text-stone-900"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (userToDelete) {
                  deleteUser(userToDelete.id);
                  setUserToDelete(null);
                }
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Hapus Pengguna
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <DialogContent className="sm:max-w-[425px] border-stone-200 rounded-md p-0">
          <DialogHeader className="p-6 pb-2">
            <div className="border border-stone-200 w-10 h-10 flex items-center justify-center mb-4">
              <Pen className="size-5 text-primary" strokeWidth={1.5} />
            </div>
            <DialogTitle className="text-xl font-light tracking-tight">
              Ubah Data Petugas
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-sm">
              Perbarui informasi identitas pengguna
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onEditSubmit} className="px-6 pb-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground dark:text-zinc-400 uppercase tracking-wide">
                Nama Lengkap
              </label>
              <Input
                placeholder="Budi Santoso"
                {...editForm.register("full_name")}
                className="rounded-md border-stone-200 focus:border-primary focus:ring-0 h-10 text-sm"
              />
              {editForm.formState.errors.full_name && (
                <p className="text-xs text-red-500">
                  {editForm.formState.errors.full_name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground dark:text-zinc-400 uppercase tracking-wide">
                Alamat Email
              </label>
              <Input
                type="email"
                placeholder="budi@bps.go.id"
                {...editForm.register("email")}
                className="rounded-md border-stone-200 bg-stone-50/50 cursor-not-allowed h-10 text-sm"
                readOnly
              />
              <p className="text-[10px] text-muted-foreground dark:text-zinc-500 italic">
                Email tidak dapat diubah
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground dark:text-zinc-400 uppercase tracking-wide">
                Hak Akses
              </label>
              <select
                {...editForm.register("role")}
                className="w-full h-10 px-3 text-sm rounded-md border border-stone-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-primary"
              >
                <option value="ppl">Petugas Pendataan Lapangan (PPL)</option>
                <option value="pml">Pengawas Lapangan (PML)</option>
                <option value="pengolahan">
                  Petugas Pengolahan Peta (Banyuwangi)
                </option>
                <option disabled value="admin">
                  Administrator Sensus
                </option>
              </select>
            </div>

            {(editSelectedRole === "ppl" || editSelectedRole === "pml") && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground dark:text-zinc-400 uppercase tracking-wide flex justify-between items-center">
                  <span>
                    Wilayah Penugasan ({editSelectedRole.toUpperCase()})
                  </span>
                  <span className="text-[10px] text-stone-400 dark:text-zinc-500 normal-case font-normal italic">
                    Dipilih: {editSelectedAssignments.length}
                  </span>
                </label>

                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-stone-400" />
                  <Input
                    placeholder={`Cari ${editSelectedRole === "pml" ? "Kecamatan" : "Desa"}...`}
                    value={assignmentSearch}
                    onChange={(e) => setAssignmentSearch(e.target.value)}
                    className="h-9 pl-8 text-xs border-stone-100 bg-stone-50/50 dark:bg-zinc-900 dark:border-zinc-600 dark:text-zinc-100"
                  />
                </div>

                <div className="border border-stone-100 rounded-md p-1 bg-stone-50/30 dark:text-zinc-100 dark:bg-zinc-900 dark:border-zinc-600 max-h-[160px] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 gap-0.5">
                    {editAvailableRegions
                      .filter((r) =>
                        r.label
                          .toLowerCase()
                          .includes(assignmentSearch.toLowerCase()),
                      )
                      .map((region) => (
                        <div
                          key={region.value}
                          onClick={() => {
                            const current = [...editSelectedAssignments];
                            const index = current.indexOf(region.value);
                            if (index > -1) {
                              current.splice(index, 1);
                            } else {
                              current.push(region.value);
                            }
                            editForm.setValue("assignments", current);
                          }}
                          className={cn(
                            "flex items-center gap-2 p-2 hover:bg-stone-100/50 dark:hover:bg-zinc-700/50 rounded cursor-pointer transition-colors group",
                            editSelectedAssignments.includes(region.value) &&
                              "bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 shadow-sm",
                          )}
                        >
                          <div
                            className="shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={editSelectedAssignments.includes(
                                region.value,
                              )}
                              onCheckedChange={() => {
                                const current = [...editSelectedAssignments];
                                const index = current.indexOf(region.value);
                                if (index > -1) {
                                  current.splice(index, 1);
                                } else {
                                  current.push(region.value);
                                }
                                editForm.setValue("assignments", current);
                              }}
                            />
                          </div>
                          <span className="text-xs text-foreground select-none">
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
              disabled={isUpdating}
            >
              {isUpdating ? "Memperbarui..." : "Perbarui Pengguna"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
