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
type BulkBody = { mode: "bulk"; users: UserPayload[] };
type DeleteBody = { mode: "delete"; user_id: string };

async function createOneUser(
  supabaseAdmin: ReturnType<typeof createClient>,
  user: UserPayload
): Promise
  | { success: true; user: UserPayload & { id: string; created_at: string } }
  | { success: false; email: string; reason: string }
> {
  const { full_name, email, role, assignments } = user;

  try {
    // 1. Buat di auth.users
    const { data: newAuthUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: crypto.randomUUID(),
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

    const userId = newAuthUser.user.id;

    // 2. Tunggu trigger selesai insert ke profiles (kalau ada trigger)
    await new Promise((res) => setTimeout(res, 500));

    // 3. Cek apakah trigger sudah insert profiles atau belum
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile) {
      // Trigger sudah insert → tinggal update full_name & role
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ full_name, role })
        .eq("id", userId);

      if (updateError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return {
          success: false,
          email,
          reason: `Profile update error: ${updateError.message}`,
        };
      }
    } else {
      // Tidak ada trigger → insert manual
      const { error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert({ id: userId, full_name, email, role });

      if (insertError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return {
          success: false,
          email,
          reason: `Profile insert error: ${insertError.message}`,
        };
      }
    }

    // 4. Insert assignments kalau ada
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
        await supabaseAdmin.from("profiles").delete().eq("id", userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return {
          success: false,
          email,
          reason: `Assignment error: ${assignError.message}`,
        };
      }
    }

    // 5. Kirim reset password email (non-blocking)
    supabaseAdmin.auth.admin
      .generateLink({ type: "recovery", email })
      .catch((e) => console.error("Reset link gagal:", e));

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
    // ── Auth check ────────────────────────────────────────────────
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

    const body: SingleBody | BulkBody | DeleteBody = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ════════════════════════════════════════════════════════════
    // MODE: SINGLE
    // ════════════════════════════════════════════════════════════
    if (body.mode === "single") {
      const { full_name, email, role, assignments } = body;
      if (!full_name || !email || !role) {
        return respond({ error: "full_name, email, role wajib diisi" }, 400);
      }

      const result = await createOneUser(supabaseAdmin, {
        full_name,
        email,
        role,
        assignments,
      });

      if (!result.success) {
        const status = result.reason.includes("sudah terdaftar") ? 409 : 500;
        return respond({ error: result.reason }, status);
      }

      return respond({ success: true, user: result.user });
    }

    // ════════════════════════════════════════════════════════════
    // MODE: BULK
    // ════════════════════════════════════════════════════════════
    if (body.mode === "bulk") {
      const { users } = body;

      if (!Array.isArray(users) || users.length === 0) {
        return respond({ error: "users array kosong" }, 400);
      }

      const MAX_BULK = 200;
      if (users.length > MAX_BULK) {
        return respond(
          {
            error: `Maksimal ${MAX_BULK} user per upload, kamu kirim ${users.length}`,
          },
          400
        );
      }

      const invalid = users
        .map((u, i) => (!u.full_name || !u.email || !u.role ? i + 1 : null))
        .filter(Boolean);

      if (invalid.length > 0) {
        return respond(
          {
            error: `Row ${invalid.join(", ")} tidak lengkap (butuh full_name, email, role)`,
          },
          400
        );
      }

      const CONCURRENCY = 5;
      const succeeded: object[] = [];
      const failed: { email: string; reason: string }[] = [];

      for (let i = 0; i < users.length; i += CONCURRENCY) {
        const chunk = users.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          chunk.map((u) => createOneUser(supabaseAdmin, u))
        );

        for (const r of results) {
          if (r.success) {
            succeeded.push(r.user);
          } else {
            failed.push({ email: r.email, reason: r.reason });
          }
        }

        if (i + CONCURRENCY < users.length) {
          await new Promise((res) => setTimeout(res, 300));
        }
      }

      return respond({ success: true, succeeded, failed });
    }

    // ════════════════════════════════════════════════════════════
    // MODE: DELETE
    // ════════════════════════════════════════════════════════════
    if (body.mode === "delete") {
      const { user_id } = body;
      if (!user_id) return respond({ error: "user_id wajib diisi" }, 400);

      // Hapus assignments dulu (foreign key)
      await supabaseAdmin
        .from("assignments")
        .delete()
        .eq("user_id", user_id);

      // Hapus profiles
      await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", user_id);

      // Hapus dari auth.users
      const { error: deleteAuthError } =
        await supabaseAdmin.auth.admin.deleteUser(user_id);

      if (deleteAuthError) {
        return respond({ error: deleteAuthError.message }, 500);
      }

      return respond({ success: true });
    }

    return respond({ error: "mode harus 'single', 'bulk', atau 'delete'" }, 400);
  } catch (e) {
    console.error("Edge function error:", e);
    return respond(
      { error: e instanceof Error ? e.message : "Internal server error" },
      500
    );
  }
});