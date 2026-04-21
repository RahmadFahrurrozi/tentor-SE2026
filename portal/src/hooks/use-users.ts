import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  userService,
  type CreateUserPayload,
  type BulkUploadResult,
} from "@/services/user.service";
import { toast } from "sonner";

export const USER_QUERY_KEYS = {
  all: ["users"] as const,
  lists: () => [...USER_QUERY_KEYS.all, "list"] as const,
  list: (page: number, pageSize: number) =>
    [...USER_QUERY_KEYS.lists(), { page, pageSize }] as const,
  details: () => [...USER_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...USER_QUERY_KEYS.details(), id] as const,
};

export function useUsersQuery(page: number = 0, pageSize: number = 25) {
  const queryClient = useQueryClient();

  // Query for fetching users
  const usersQuery = useQuery({
    queryKey: USER_QUERY_KEYS.list(page, pageSize),
    queryFn: () => userService.getUsers({ page, pageSize }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    meta: {
      onError: (error: Error) => {
        console.error("❌ Fetch users error:", error);
        toast.error("Gagal memuat data pengguna");
      },
    },
  });

  // Mutation for creating single user
  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserPayload) => userService.createUser(data),
    onSuccess: (newUser) => {
      console.log("✅ User created successfully:", newUser);
      toast.success(`Pengguna ${newUser.full_name} berhasil ditambahkan`);
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.lists() });
    },
    onError: (error: Error) => {
      console.error("❌ Create user error:", error);
      toast.error(error.message || "Gagal menambahkan pengguna");
    },
  });

  // Mutation for bulk create users
  const bulkCreateUsersMutation = useMutation({
    mutationFn: ({
      users,
      onProgress,
    }: {
      users: CreateUserPayload[];
      onProgress?: (processed: number, total: number) => void;
    }) => userService.bulkCreateUsers(users, { onProgress }),
    onSuccess: (result: BulkUploadResult) => {
      console.log("✅ Bulk upload completed:", result);

      if (result.succeeded.length > 0) {
        toast.success(`${result.succeeded.length} pengguna berhasil diimport`);
      }

      if (result.failed.length > 0) {
        toast.warning(`${result.failed.length} pengguna gagal diimport`);
        // Log failed details
        console.warn("Failed imports:", result.failed);
      }

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.lists() });
    },
    onError: (error: Error) => {
      console.error("❌ Bulk upload error:", error);
      toast.error(error.message || "Gagal melakukan import massal");
    },
  });

  // Mutation for deleting user
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: (_, deletedId) => {
      console.log("✅ User deleted successfully:", deletedId);
      toast.success("Pengguna berhasil dihapus");
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.lists() });
    },
    onError: (error: Error) => {
      console.error("❌ Delete user error:", error);
      toast.error(error.message || "Gagal menghapus pengguna");
    },
  });

  return {
    // Data
    users: usersQuery.data?.data ?? [],
    total: usersQuery.data?.total ?? 0,
    totalPages: usersQuery.data?.totalPages ?? 0,

    // Status
    isLoading: usersQuery.isLoading,
    isFetching: usersQuery.isFetching,
    isError: usersQuery.isError,
    error: usersQuery.error,

    // Actions
    createUser: createUserMutation.mutate,
    isCreating: createUserMutation.isPending,

    bulkCreateUsers: bulkCreateUsersMutation.mutate,
    isBulkUploading: bulkCreateUsersMutation.isPending,
    bulkProgress: {
      processed: 0,
      total: 0,
    }, // Progress handled in component

    deleteUser: deleteUserMutation.mutate,
    isDeleting: deleteUserMutation.isPending,

    // Refetch
    refetch: () => usersQuery.refetch(),
  };
}
