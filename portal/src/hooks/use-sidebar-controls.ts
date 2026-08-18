import { useEffect, useMemo } from "react";
import { useMapStore } from "@/store/mapStore";
import { useAuthStore } from "@/store/auth-store";
import { useAuth } from "@/hooks/use-auth";

/**
 * Custom Hook: useSidebarControls
 * 
 * Mengelola seluruh logika state filter wilayah, autentikasi user, 
 * hak akses role (Admin/PML/PPL), serta handler reset filter pada Sidebar.
 */
export function useSidebarControls(spatialData: any) {
  // ── 1. Store & Auth Hooks ───────────────────────────────────────────────────
  
  /**
   * Hook Zustand MapStore:
   * Menyimpan dan memperbarui filter aktif (filterKecamatan, filterDesa, filterNama),
   * toggle layer peta, versi dataset (prelist/se2026), dan mode komparasi.
   */
  const store = useMapStore();

  /**
   * Hook AuthStore:
   * Mengambil data profil pengguna yang sedang aktif login (nama, email, role).
   */
  const { profile, user } = useAuthStore();

  /**
   * Hook useAuth:
   * Mengelola proses logout pengguna dan memberikan indikator loading (isLoggingOut).
   */
  const { logout, isLoggingOut } = useAuth();

  // ── 2. Data Spatial & Role Extraction ───────────────────────────────────────
  
  const { wilayahManifest, assignments = [] } = spatialData || {};
  const role = profile?.role ?? "ppl";

  // ── 3. Filter & Option Calculations (Memoized) ──────────────────────────────
  
  /**
   * Hook useMemo: Extract daftar ID Kecamatan unik dari assignment penugasan user.
   */
  const assignedKecs = useMemo(() => {
    return Array.from(
      new Set(assignments.map((a: any) => a.idkec).filter(Boolean))
    ) as string[];
  }, [assignments]);

  /**
   * Hook useMemo: Extract daftar ID Desa/Kelurahan unik dari assignment penugasan user.
   */
  const assignedDesas = useMemo(() => {
    return Array.from(
      new Set(assignments.map((a: any) => a.iddesa).filter(Boolean))
    ) as string[];
  }, [assignments]);

  /**
   * Mengambil array list seluruh kecamatan dari manifest wilayah
   */
  const allKecamatans = Array.isArray(wilayahManifest)
    ? wilayahManifest
    : wilayahManifest?.kecamatan || [];

  /**
   * Hook useMemo: Menyaring opsi Kecamatan berdasarkan hak akses Role:
   * - Admin: Menampilkan seluruh Kecamatan se-Kabupaten
   * - PML / PPL: Hanya menampilkan Kecamatan sesuai penugasan
   */
  const kecOptions = useMemo(() => {
    return allKecamatans.filter((k: any) => {
      if (role === "admin") return true;
      return assignedKecs.includes(k.idkec);
    });
  }, [allKecamatans, role, assignedKecs]);

  /**
   * Menemukan objek Kecamatan yang sedang dipilih di filter
   */
  const selectedKecObj = allKecamatans.find(
    (k: any) => String(k.idkec) === String(store.filterKecamatan)
  );

  const rawDesaOptions = selectedKecObj?.desa || [];

  /**
   * Hook useMemo: Menyaring opsi Desa berdasarkan Kecamatan terpilih & Role user:
   * - Admin / PML: Menampilkan seluruh desa di kecamatan tersebut
   * - PPL: Hanya menampilkan desa yang ditugaskan kepada PPL tersebut
   */
  const desaOptions = useMemo(() => {
    return rawDesaOptions.filter((d: any) => {
      if (role !== "ppl") return true;
      return assignedDesas.includes(d.iddesa);
    });
  }, [rawDesaOptions, role, assignedDesas]);

  // ── 4. React Effects ────────────────────────────────────────────────────────
  
  /**
   * Hook useEffect:
   * Otomatis mendaftarkan Desa pertama penugasan untuk user ber-role PPL
   * ketika PPL memilih Kecamatan tertentu.
   */
  useEffect(() => {
    if (
      role === "ppl" &&
      store.filterKecamatan &&
      store.filterKecamatan !== "Semua"
    ) {
      const kecamatan = allKecamatans.find(
        (k: any) => String(k.idkec) === String(store.filterKecamatan)
      );
      if (kecamatan && kecamatan.desa) {
        const firstAssignedDesa = kecamatan.desa.find((d: any) =>
          assignedDesas.includes(d.iddesa)
        );
        if (
          firstAssignedDesa &&
          store.filterDesa !== firstAssignedDesa.iddesa
        ) {
          store.setFilter("filterDesa", firstAssignedDesa.iddesa);
        }
      }
    }
  }, [store.filterKecamatan, role, allKecamatans, assignedDesas]);

  // ── 5. Action Handlers ───────────────────────────────────────────────────────
  
  /**
   * Action Handler: Reset Filter Wilayah
   * Mengembalikan posisi filter ke default sesuai batasan Role masing-masing user.
   */
  const handleResetFilter = () => {
    if (role === "ppl") {
      if (assignedDesas.length > 0 && allKecamatans.length > 0) {
        let firstKecamatan = null;
        let firstDesa = null;
        for (const kec of allKecamatans) {
          const desaTugas = kec.desa?.find((d: any) =>
            assignedDesas.includes(d.iddesa)
          );
          if (desaTugas) {
            firstKecamatan = kec.idkec;
            firstDesa = desaTugas.iddesa;
            break;
          }
        }
        store.setFilter("filterKecamatan", firstKecamatan);
        store.setFilter("filterDesa", firstDesa);
        store.setFilter("filterNama", "");
      } else {
        store.resetFilter(role, assignedDesas, allKecamatans);
      }
    } else if (role === "pml") {
      if (kecOptions.length > 0) {
        store.setFilter("filterKecamatan", kecOptions[0].idkec);
        store.setFilter("filterDesa", "Semua");
        store.setFilter("filterNama", "");
      } else {
        store.resetFilter(role, assignedDesas, allKecamatans);
      }
    } else {
      store.resetFilter(role, assignedDesas, allKecamatans);
    }
  };

  // ── 6. User Formatting Helpers ──────────────────────────────────────────────
  
  const userEmail = profile?.email || user?.email || "";
  const userFullName = profile?.full_name || "PML User";
  const userInitials =
    userFullName
      .split(" ")
      .filter(Boolean)
      .map((n: string) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "U";

  const displayRole =
    role === "admin"
      ? "Admin"
      : role === "pml"
        ? "PML"
        : role === "ppl"
          ? "PPL"
          : role?.toUpperCase();

  return {
    store,
    role,
    kecOptions,
    desaOptions,
    handleResetFilter,
    logout,
    isLoggingOut,
    userEmail,
    userFullName,
    userInitials,
    displayRole,
  };
}
