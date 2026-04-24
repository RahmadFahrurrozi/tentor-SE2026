import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type UserPayload = {
  full_name: string;
  email: string;
  role: string;
  assignments?: string[];
};

type SingleBody = { mode: "single" } & UserPayload;
type UpdateBody = { mode: "update"; user_id: string } & UserPayload;
type BulkBody = { mode: "bulk"; users: UserPayload[] };
type DeleteBody = { mode: "delete"; user_id: string };

function generatePassword(email: string): string {
  const prefix = email.split("@")[0].slice(0, 4);
  return `${prefix}SE2026`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createOneUser(
  supabaseAdmin: ReturnType<typeof createClient>,
  user: UserPayload,
  existingUserId?: string
): Promise<
  | { success: true; user: UserPayload & { id: string; created_at: string } }
  | { success: false; email: string; reason: string }
> {
  const { full_name, email, role, assignments } = user;

  try {
    let userId = existingUserId;

    if (!userId) {
      // Mode create: buat user baru dengan password dari email
      const password = generatePassword(email);

      const { data: newAuthUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name, role },
        });

      if (createError) {
        const isDuplicate =
          createError.message.includes("already been registered") ||
          createError.message.includes("already exists");
        return {
          success: false,
          email,
          reason: isDuplicate ? "Email sudah terdaftar" : createError.message,
        };
      }

      userId = newAuthUser.user.id;
    } else {
      // Mode update: perbarui metadata saja, password tidak diubah
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { full_name, role },
      });
    }

    // Upsert ke profiles
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name,
          email,
          role: role.toLowerCase(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (profileError) {
      if (!existingUserId) await supabaseAdmin.auth.admin.deleteUser(userId);
      return {
        success: false,
        email,
        reason: `DB Profile Error: ${profileError.message} (Code: ${profileError.code})`,
      };
    }

    // Hapus assignments lama, insert baru
    await supabaseAdmin.from("assignments").delete().eq("user_id", userId);

    if (assignments && assignments.length > 0) {
      const rows = assignments.map((id) =>
        role.toLowerCase() === "ppl"
          ? { user_id: userId, iddesa: id, idkec: id.substring(0, 7) }
          : { user_id: userId, idkec: id }
      );

      const { error: assignError } = await supabaseAdmin
        .from("assignments")
        .insert(rows);

      if (assignError) {
        return {
          success: false,
          email,
          reason: `DB Assignment Error: ${assignError.message} (Code: ${assignError.code})`,
        };
      }
    }

    return {
      success: true,
      user: {
        id: userId,
        full_name,
        email,
        role,
        assignments: assignments ?? [],
        created_at: new Date().toISOString(),
      },
    };
  } catch (e) {
    return {
      success: false,
      email,
      reason: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user: caller },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !caller) return respond({ error: "Unauthorized" }, 401);

    const { data: callerProfile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return respond({ error: "Forbidden: hanya admin" }, 403);
    }

    const body: SingleBody | BulkBody | DeleteBody | UpdateBody =
      await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Single / Update ──────────────────────────────────────────────────────
    if (body.mode === "single" || body.mode === "update") {
      const { full_name, email, role, assignments } = body;
      const user_id = body.mode === "update" ? body.user_id : undefined;

      if (!full_name || !email || !role) {
        return respond({ error: "full_name, email, role wajib diisi" }, 400);
      }

      const result = await createOneUser(
        supabaseAdmin,
        { full_name, email, role, assignments },
        user_id
      );

      if (!result.success) {
        const status = result.reason.includes("sudah terdaftar") ? 409 : 500;
        return respond({ error: result.reason }, status);
      }

      return respond({ success: true, user: result.user });
    }

    // ── Bulk ─────────────────────────────────────────────────────────────────
    if (body.mode === "bulk") {
      const { users } = body;
      if (!Array.isArray(users) || users.length === 0) {
        return respond({ error: "users array kosong" }, 400);
      }

      const MAX_BULK = 200;
      if (users.length > MAX_BULK) {
        return respond({ error: `Maksimal ${MAX_BULK} user` }, 400);
      }

      // Free plan: concurrency rendah + delay antar batch biar aman dari rate limit
      const CONCURRENCY = 3;
      const DELAY_MS = 700;

      const succeeded: any[] = [];
      const failed: any[] = [];

      for (let i = 0; i < users.length; i += CONCURRENCY) {
        const chunk = users.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          chunk.map((u) => createOneUser(supabaseAdmin, u))
        );

        for (const r of results) {
          if (r.success) succeeded.push(r.user);
          else failed.push({ email: r.email, reason: r.reason });
        }

        // Jeda antar batch kecuali batch terakhir
        if (i + CONCURRENCY < users.length) {
          await sleep(DELAY_MS);
        }
      }

      return respond({ success: true, succeeded, failed });
    }

    // ── Delete ───────────────────────────────────────────────────────────────
    if (body.mode === "delete") {
      const { user_id } = body;
      if (!user_id) return respond({ error: "user_id wajib diisi" }, 400);

      await supabaseAdmin.from("assignments").delete().eq("user_id", user_id);
      await supabaseAdmin.from("profiles").delete().eq("id", user_id);
      const { error: delError } =
        await supabaseAdmin.auth.admin.deleteUser(user_id);

      if (delError) return respond({ error: delError.message }, 500);
      return respond({ success: true });
    }

    return respond({ error: "mode tidak valid" }, 400);
  } catch (e) {
    return respond({ error: e instanceof Error ? e.message : "Error" }, 500);
  }
});