import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database.types";
import type { UserType } from "../pages/user/columns";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROFILE_COLUMNS = "id, full_name, email, role, created_at" as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Map CreateUserPayload → ProfileInsert.
 *
 * TIDAK kirim `id` — biarkan Supabase yang generate via gen_random_uuid().
 * Kalau profiles.id harus sama dengan auth.users.id (foreign key ke auth),
 * maka `id` seharusnya di-set oleh trigger `on_new_user` di Supabase,
 * bukan di-generate manual di client.
 */
function toInsertPayload(data: CreateUserPayload): ProfileInsert {
  return {
    full_name: data.full_name,
    email: data.email,
    role: data.role,
  } as ProfileInsert;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const userService = {
  async getUsers(
    params: PaginationParams = { page: 0, pageSize: 25 },
  ): Promise<PaginatedResult<UserType>> {
    const { page, pageSize } = params;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .order("created_at", { ascending: false })
        .range(from, to),

      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    if (error) throw new Error(error.message);
    if (countError) throw new Error(countError.message);

    return {
      data: (data ?? []) as UserType[],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  },

  async createUser(data: CreateUserPayload): Promise<UserType> {
    const { data: inserted, error } = await supabase
      .from("profiles")
      .insert(toInsertPayload(data))
      .select(PROFILE_COLUMNS)
      .single();

    if (error) throw new Error(error.message);
    return inserted as UserType;
  },

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async bulkCreateUsers(
    users: CreateUserPayload[],
    options: BulkUploadOptions = {},
  ): Promise<BulkUploadResult> {
    const {
      batchSize = 10,
      delayBetweenBatches = 300,
      maxUsers = 200,
      onProgress,
    } = options;

    const result: BulkUploadResult = { succeeded: [], failed: [] };

    if (users.length > maxUsers) {
      throw new Error(
        `Maksimal ${maxUsers} pengguna per upload. ` +
          `Anda mencoba upload ${users.length} pengguna. ` +
          `Pecah menjadi beberapa file CSV.`,
      );
    }

    const chunks: CreateUserPayload[][] = [];
    for (let i = 0; i < users.length; i += batchSize) {
      chunks.push(users.slice(i, i + batchSize));
    }

    let processed = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const insertPayloads: ProfileInsert[] = chunk.map(toInsertPayload);

      const { data: inserted, error } = await supabase
        .from("profiles")
        .upsert(insertPayloads, {
          onConflict: "email",
          ignoreDuplicates: true,
        })
        .select(PROFILE_COLUMNS);

      if (error) {
        chunk.forEach((u) =>
          result.failed.push({ user: u, reason: error.message }),
        );
      } else {
        result.succeeded.push(...((inserted ?? []) as UserType[]));
      }

      processed += chunk.length;
      onProgress?.(processed, users.length);

      if (i < chunks.length - 1) {
        await sleep(delayBetweenBatches);
      }
    }

    return result;
  },
};
