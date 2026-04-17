import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { userService } from "../services/user.service";
import type { UserType } from "../pages/user/columns";

export const useUsers = () => {
  const queryClient = useQueryClient();

  // 1. Validasi & Fetching Table Data
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.getUsers(),
  });

  // 2. Mutation Delete User
  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: (_, deletedId) => {
      // Update cache optimistically
      queryClient.setQueryData(["users"], (oldData: UserType[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter((u) => u.id !== deletedId);
      });
      toast.success("Berhasil menghapus pengguna.", {
        description: "Data pengguna telah dihapus dari sistem.",
      });
    },
    onError: (error) => {
      toast.error("Gagal menghapus pengguna.", {
        description: error.message || "Terjadi kesalahan pada server.",
      });
    },
  });

  // 3. Mutation Create User
  const createMutation = useMutation({
    mutationFn: (data: Omit<UserType, "id" | "created_at">) =>
      userService.createUser(data),
    onSuccess: () => {
      // Invalidate the cache to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Pengguna berhasil ditambahkan.", {
        description: "Pengguna baru telah terdaftar di sistem.",
      });
    },
    onError: (error) => {
      toast.error("Gagal menambahkan pengguna.", {
        description: error.message || "Silakan coba lagi.",
      });
    },
  });

  return {
    users: usersQuery.data ?? [],
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    deleteUser: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    createUser: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
};
