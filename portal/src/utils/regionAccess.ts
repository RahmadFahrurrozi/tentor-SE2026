import type { KabupatenId } from "@/store/mapStore";

export interface RegionAccessResult {
  isSuperAdmin: boolean;
  allowedKabupaten: KabupatenId[];
  lockedKabupaten: KabupatenId | null;
}

/**
 * Helper untuk menentukan hak akses wilayah berdasarkan akun login:
 * - Admin Banyuwangi / Super Admin: bisa melihat semua kabupaten/kota.
 * - Admin Madiun: dikunci hanya bisa melihat Kota Madiun (3577).
 * - Admin Sidoarjo: dikunci hanya bisa melihat Kab. Sidoarjo (3515).
 */
export function getUserRegionAccess(
  profile: any,
  user: any,
  assignments: any[] = []
): RegionAccessResult {
  const email = (profile?.email || user?.email || "").toLowerCase().trim();
  const role = (profile?.role || "").toLowerCase().trim();

  // 1. Super Admin: Hanya jika role adalah admin/superadmin DAN email admin
  if (
    (role === "admin" || role === "superadmin") &&
    (email === "admin@bps-bwi.go.id" ||
      email.includes("superadmin") ||
      role === "superadmin")
  ) {
    return {
      isSuperAdmin: true,
      allowedKabupaten: ["3510", "3515", "3577"],
      lockedKabupaten: null,
    };
  }

  // 1b. Khusus akun Pengolahan atau akun Banyuwangi (PPL / PML): Kunci ke Banyuwangi (3510)
  if (
    role === "pengolahan" ||
    email.includes("bps-bwi.go.id") ||
    email.includes("banyuwangi")
  ) {
    return {
      isSuperAdmin: false,
      allowedKabupaten: ["3510"],
      lockedKabupaten: "3510",
    };
  }

  // 2. Cek apakah ada field kabupaten_id di profile atau user_metadata
  const explicitKab =
    profile?.kabupaten_id ||
    user?.user_metadata?.kabupaten_id ||
    user?.user_metadata?.kabupaten;

  if (explicitKab === "3577" || explicitKab === "3515" || explicitKab === "3510") {
    return {
      isSuperAdmin: false,
      allowedKabupaten: [explicitKab as KabupatenId],
      lockedKabupaten: explicitKab as KabupatenId,
    };
  }

  // 3. Deteksi via kata kunci pada Email atau Nama
  const fullName = (profile?.full_name || "").toLowerCase();
  if (email.includes("madiun") || fullName.includes("madiun")) {
    return {
      isSuperAdmin: false,
      allowedKabupaten: ["3577"],
      lockedKabupaten: "3577",
    };
  }
  if (email.includes("sidoarjo") || fullName.includes("sidoarjo")) {
    return {
      isSuperAdmin: false,
      allowedKabupaten: ["3515"],
      lockedKabupaten: "3515",
    };
  }

  // 4. Deteksi via assignment wilayah (jika ada kode kecamatan/desa yang ditugaskan)
  if (assignments && assignments.length > 0) {
    const kecCodes = assignments
      .map((a: any) => String(a.idkec || a.iddesa || ""))
      .filter(Boolean);

    if (kecCodes.some((k) => k.startsWith("3577"))) {
      return {
        isSuperAdmin: false,
        allowedKabupaten: ["3577"],
        lockedKabupaten: "3577",
      };
    }
    if (kecCodes.some((k) => k.startsWith("3515"))) {
      return {
        isSuperAdmin: false,
        allowedKabupaten: ["3515"],
        lockedKabupaten: "3515",
      };
    }
    if (kecCodes.some((k) => k.startsWith("3510"))) {
      return {
        isSuperAdmin: false,
        allowedKabupaten: ["3510"],
        lockedKabupaten: "3510",
      };
    }
  }

  // 5. Fallback jika user admin biasa (tanpa tag daerah khusus): Super Admin
  if (role === "admin") {
    return {
      isSuperAdmin: true,
      allowedKabupaten: ["3510", "3515", "3577"],
      lockedKabupaten: null,
    };
  }

  // Default fallback
  return {
    isSuperAdmin: false,
    allowedKabupaten: ["3510"],
    lockedKabupaten: "3510",
  };
}
