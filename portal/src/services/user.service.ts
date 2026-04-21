import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";
import type { UserType } from "../pages/user/columns";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type AssignmentInsert = Database["public"]["Tables"]["assignments"]["Insert"];

export interface Region {
  iddesa: string;
  idkec: string;
  nmdesa: string;
  nmkec: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type CreateUserPayload = Omit<UserType, "id" | "created_at">;

export interface BulkUploadOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  maxUsers?: number;
  onProgress?: (processed: number, total: number) => void;
}

export interface BulkUploadResult {
  succeeded: UserType[];
  failed: Array<{ user: CreateUserPayload; reason: string }>;
}

// Debug logger
const DEBUG = true;

function logDebug(action: string, data: any, error?: any) {
  if (!DEBUG) return;

  console.group(`🔍 DEBUG: ${action}`);
  console.log("📦 Data:", data);
  if (error) console.error("❌ Error:", error);
  console.trace("📍 Stack trace");
  console.groupEnd();
}

const PROFILE_COLUMNS = "id, full_name, email, role, created_at" as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toInsertPayload(data: CreateUserPayload): ProfileInsert {
  logDebug("toInsertPayload", {
    input: data,
    output: {
      full_name: data.full_name,
      email: data.email,
      role: data.role,
    },
  });

  return {
    full_name: data.full_name,
    email: data.email,
    role: data.role,
  } as ProfileInsert;
}

export const userService = {
  async getUsers(
    params: PaginationParams = { page: 0, pageSize: 25 },
  ): Promise<PaginatedResult<UserType>> {
    logDebug("getUsers - start", params);

    const { page, pageSize } = params;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    try {
      const [{ data, error }, { count, error: countError }] = await Promise.all(
        [
          supabase
            .from("profiles")
            .select(
              `
              id, 
              full_name, 
              email, 
              role, 
              created_at,
              assignments(iddesa, idkec)
            `,
            )
            .order("created_at", { ascending: false })
            .range(from, to),

          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true }),
        ],
      );

      if (error) {
        logDebug("getUsers - Supabase error", null, error);
        throw new Error(error.message);
      }
      if (countError) {
        logDebug("getUsers - Count error", null, countError);
        throw new Error(countError.message);
      }

      // Format assignments from array of objects to array of strings
      const formattedData = (data ?? []).map((user: any) => ({
        ...user,
        assignments: Array.from(
          new Set(
            user.assignments
              ?.map((a: any) => a.iddesa || a.idkec)
              .filter(Boolean),
          ),
        ),
      })) as UserType[];

      const result = {
        data: formattedData,
        total: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      };

      logDebug("getUsers - success", {
        dataCount: result.data.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      });

      return result;
    } catch (error) {
      logDebug("getUsers - exception", null, error);
      throw error;
    }
  },

async createUser(data: CreateUserPayload): Promise<UserType> {
  logDebug("createUser - start", data);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Sesi tidak valid");

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          mode: "single",           // ← tambah mode
          full_name: data.full_name,
          email: data.email,
          role: data.role,
          assignments: data.assignments ?? [],
        }),
      }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Gagal membuat pengguna");

    logDebug("createUser - success", result.user);
    return result.user as UserType;
  } catch (error) {
    logDebug("createUser - exception", null, error);
    throw error;
  }
},


async deleteUser(id: string): Promise<void> {
  logDebug("deleteUser - start", { id });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Sesi tidak valid");

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          mode: "delete",
          user_id: id,
        }),
      }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Gagal menghapus pengguna");

    logDebug("deleteUser - success", { id });
  } catch (error) {
    logDebug("deleteUser - exception", null, error);
    throw error;
  }
},

async bulkCreateUsers(
  users: CreateUserPayload[],
  options: BulkUploadOptions = {}
): Promise<BulkUploadResult> {
  const { maxUsers = 200, onProgress } = options;

  logDebug("bulkCreateUsers - start", { total: users.length });

  if (users.length > maxUsers) {
    throw new Error(
      `Maksimal ${maxUsers} pengguna per upload. Kamu mencoba upload ${users.length}.`
    );
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sesi tidak valid");

  // Simulasi progress bar karena request ini single shot
  onProgress?.(0, users.length);

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        mode: "bulk",             // ← mode bulk
        users: users.map((u) => ({
          full_name: u.full_name,
          email: u.email,
          role: u.role,
          assignments: u.assignments ?? [],
        })),
      }),
    }
  );

  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Bulk upload gagal");

  onProgress?.(users.length, users.length);

  logDebug("bulkCreateUsers - done", {
    succeeded: result.succeeded.length,
    failed: result.failed.length,
  });

  return {
    succeeded: result.succeeded as UserType[],
    failed: result.failed.map((f: { email: string; reason: string }) => ({
      user: users.find((u) => u.email === f.email)!,
      reason: f.reason,
    })),
  };
},

  async getMasterRegions(): Promise<Region[]> {
    logDebug("getMasterRegions - start", null);
    try {
      const { data, error } = await supabase
        .from("master_wilayah")
        .select("iddesa, idkec, nmdesa, nmkec")
        .order("nmkec", { ascending: true })
        .order("nmdesa", { ascending: true });

      if (error) throw new Error(error.message);
      return (data || []) as Region[];
    } catch (error) {
      logDebug("getMasterRegions - error", null, error);
      throw error;
    }
  },

  async getUserAssignments(userId: string): Promise<string[]> {
    logDebug("getUserAssignments - start", { userId });
    try {
      const { data, error } = await supabase
        .from("assignments")
        .select("iddesa, idkec")
        .eq("user_id", userId);

      if (error) throw new Error(error.message);

      // Return combination of iddesa and idkec (flattened)
      const ids = (data || [])
        .map((a) => a.iddesa || a.idkec)
        .filter(Boolean) as string[];
      return Array.from(new Set(ids));
    } catch (error) {
      logDebug("getUserAssignments - error", null, error);
      throw error;
    }
  },

  async updateUserAssignments(
    userId: string,
    assignmentIds: string[],
    role: string,
  ): Promise<void> {
    logDebug("updateUserAssignments - start", { userId, assignmentIds, role });
    try {
      // 1. Delete existing assignments
      const { error: deleteError } = await supabase
        .from("assignments")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw new Error(deleteError.message);

      if (assignmentIds.length === 0) return;

      // 2. Insert new assignments
      const inserts: AssignmentInsert[] = assignmentIds.map((id) => {
        if (role.toLowerCase() === "ppl") {
          return { user_id: userId, iddesa: id, idkec: id.substring(0, 7) };
        } else {
          return { user_id: userId, idkec: id };
        }
      });

      const { error: insertError } = await supabase
        .from("assignments")
        .insert(inserts);

      if (insertError) throw new Error(insertError.message);
      logDebug("updateUserAssignments - success", { userId });
    } catch (error) {
      logDebug("updateUserAssignments - error", null, error);
      throw error;
    }
  },
};
