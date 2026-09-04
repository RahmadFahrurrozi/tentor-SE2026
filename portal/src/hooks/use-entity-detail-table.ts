import { useState, useMemo } from "react";
import { useMapStore } from "@/store/mapStore";
import { useAuthStore } from "@/store/auth-store";
import {
  extractDusunAndSlsList,
  getSlsId,
  isSlsMatch,
  normalizeSlsId,
} from "@/utils/slsHelper";
import * as XLSX from "xlsx";

/**
 * Tipe entitas yang didukung oleh tabel rincian.
 */
export type EntityType =
  | "all"
  | "usaha"
  | "usaha-digital"
  | "usaha-pertanian"
  | "rt"
  | "bangunan";

/**
 * Interface item entitas yang telah dinormalisasi.
 */
export interface EntityItem {
  /** Identifier unik entitas */
  id: string;
  /** Nama entitas, usaha, atau kepala keluarga */
  nama: string;
  /** Alamat lengkap atau deskripsi lokasi entitas */
  alamat: string;
  /** Tipe entitas terdaftar */
  type: Exclude<EntityType, "all">;
  /** Label tipe entitas yang ramah pengguna (contoh: "Usaha Biasa", "Rumah Tangga") */
  typeLabel: string;
  /** Class Tailwind CSS untuk styling badge tipe entitas */
  badgeClass: string;
  /** Kode ID Desa/Kelurahan (opsional) */
  iddesa?: string;
  /** Kode ID Kecamatan (opsional) */
  idkec?: string;
  /** Detail atau kategori tambahan (contoh: jenis usaha, komoditas, status kunjungan) */
  detail?: string;
}

/**
 * Interface jumlah entitas per kategori.
 */
export interface EntityCounts {
  all: number;
  usaha: number;
  "usaha-digital": number;
  "usaha-pertanian": number;
  rt: number;
  bangunan: number;
}

/**
 * Interface return value dari hook useEntityDetailTable.
 */
export interface UseEntityDetailTableReturn {
  /** Daftar entitas lengkap yang sudah difilter berdasarkan wilayah (Kecamatan/Desa) */
  allEntities: EntityItem[];
  /** Daftar entitas yang sudah difilter berdasarkan tab aktif dan pencarian */
  filteredList: EntityItem[];
  /** Data entitas untuk halaman aktif saat ini */
  paginatedData: EntityItem[];
  /** Jumlah entitas per kategori tipe */
  counts: EntityCounts;
  /** Tab kategori yang sedang aktif saat ini */
  activeTab: EntityType;
  /** Kata kunci pencarian saat ini */
  searchQuery: string;
  /** Halaman aktif saat ini (1-indexed) */
  currentPage: number;
  /** Jumlah total halaman pagination */
  totalPages: number;
  /** Jumlah item yang ditampilkan per halaman */
  itemsPerPage: number;
  /** Apakah pengguna saat ini memiliki hak akses Admin */
  isAdmin: boolean;
  /** Handler untuk mengubah tab kategori dan mereset halaman ke 1 */
  handleTabChange: (tab: EntityType) => void;
  /** Handler untuk mengubah input pencarian dan mereset halaman ke 1 */
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Function untuk langsung memperbarui kata kunci pencarian */
  setSearchQuery: (query: string) => void;
  /** Setter untuk mengubah halaman pagination aktif */
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  /** Handler untuk mengekspor data terfilter ke format CSV */
  handleExportCSV: () => void;
  /** Handler untuk mengekspor data terfilter ke format Excel (.xlsx) */
  handleExportExcel: () => void;
}

/**
 * Hook kustom `useEntityDetailTable`
 * 
 * Mengelola seluruh logika bisnis untuk komponen `EntityDetailTable`, termasuk:
 * 1. Normalisasi data spasial (Usaha Biasa, Digital, Pertanian, Rumah Tangga, Bangunan)
 * 2. Penyaringan wilayah berdasarkan filter Kecamatan dan Desa dari `useMapStore`
 * 3. Filter pencarian teks langsung dan filter tab kategori
 * 4. Penghitungan agregat total entitas per kategori
 * 5. Kalkulasi pagination data
 * 6. Ekspor laporan data terfilter ke format CSV dan Excel (khusus role Admin)
 * 
 * @param spatialData Dataset spasial yang memuat dataUsaha, dataUsahaDigital, dataUsahaPertanian, dataRumahTangga, dan dataBangunan.
 * @returns Object `UseEntityDetailTableReturn` yang siap dikonsumsi oleh komponen UI.
 */
export function useEntityDetailTable(spatialData: any): UseEntityDetailTableReturn {
  const store = useMapStore();
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === "admin";

  const [activeTab, setActiveTab] = useState<EntityType>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const {
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataBangunan,
    dataSls,
  } = spatialData || {};

  /**
   * Ekstraksi map parsed SLS untuk pengecekan nama Dusun
   */
  const { parsedSlsMap } = useMemo(() => {
    return extractDusunAndSlsList(dataSls, store.filterDesa, store.filterDusun);
  }, [dataSls, store.filterDesa, store.filterDusun]);

  /**
   * Helper internal untuk memfilter item berdasarkan filter Kecamatan, Desa, Dusun & RT/RW dari `mapStore`.
   */
  const filterByRegion = (item: any): boolean => {
    const idslsStr = getSlsId(item);
    const iddesa =
      item.iddesa ||
      item.id_desa ||
      (idslsStr.length >= 10 ? idslsStr.substring(0, 10) : "");
    const idkec =
      item.idkec ||
      item.id_kec ||
      (idslsStr.length >= 7 ? idslsStr.substring(0, 7) : "") ||
      String(iddesa).substring(0, 7);

    if (store.filterKecamatan !== "Semua" && store.filterKecamatan) {
      if (normalizeSlsId(idkec) !== normalizeSlsId(store.filterKecamatan)) return false;
    }
    if (store.filterDesa !== "Semua" && store.filterDesa) {
      if (normalizeSlsId(iddesa) !== normalizeSlsId(store.filterDesa)) return false;
    }
    if (store.filterSls !== "Semua" && store.filterSls) {
      if (!isSlsMatch(idslsStr, store.filterSls)) return false;
    }
    if (store.filterDusun !== "Semua" && store.filterDusun) {
      const parsed =
        parsedSlsMap.get(idslsStr) ||
        (idslsStr.length >= 14 ? parsedSlsMap.get(idslsStr.substring(0, 14)) : undefined);
      if (!parsed || parsed.dusun !== store.filterDusun) return false;
    }
    return true;
  };

  /**
   * Menggabungkan dan menormalisasi seluruh data spasial menjadi satu array unified `EntityItem[]`.
   */
  const allEntities = useMemo<EntityItem[]>(() => {
    const list: EntityItem[] = [];

    // 1. Usaha Biasa
    (dataUsaha || []).forEach((u: any, i: number) => {
      if (!filterByRegion(u)) return;
      list.push({
        id: `ub-${i}-${u.id || u.idsls_str || i}`,
        nama:
          u["nama final"] ||
          u.nama_final ||
          u["Nama usaha"] ||
          u["Nama Usaha"] ||
          u.nama_usaha_edit ||
          u.nama_komersial ||
          u.nama_usaha ||
          u.nama ||
          u.nm_project ||
          "Usaha Biasa",
        alamat:
          u["alamat final"] ||
          u.alamat_final ||
          u["Alamat"] ||
          u.alamat ||
          u.deskripsi_project ||
          "-",
        type: "usaha",
        typeLabel: "Usaha Biasa",
        badgeClass:
          "bg-amber-500/10 text-amber-500 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400",
        iddesa: u.iddesa,
        idkec: u.idkec,
        detail: u.kategori || u.jenis_usaha || "Non-Pertanian",
      });
    });

    // 2. Usaha Digital
    (dataUsahaDigital || []).forEach((ud: any, i: number) => {
      if (!filterByRegion(ud)) return;
      list.push({
        id: `ud-${i}-${ud.id || ud.idsls_str || i}`,
        nama:
          ud["nama final"] ||
          ud.nama_final ||
          ud["Nama usaha"] ||
          ud["Nama Usaha"] ||
          ud.nama_usaha_edit ||
          ud.nama_komersial ||
          ud.nama_usaha ||
          ud.nama ||
          ud.nm_project ||
          "Usaha Digital",
        alamat:
          ud["alamat final"] ||
          ud.alamat_final ||
          ud["Alamat"] ||
          ud.alamat ||
          ud.deskripsi_project ||
          "-",
        type: "usaha-digital",
        typeLabel: "Usaha Digital",
        badgeClass:
          "bg-pink-500/10 text-pink-500 border-pink-500/30 dark:bg-pink-500/20 dark:text-pink-400",
        iddesa: ud.iddesa,
        idkec: ud.idkec,
        detail: ud.kategori || "E-Commerce / Online",
      });
    });

    // 3. Usaha Pertanian
    (dataUsahaPertanian || []).forEach((up: any, i: number) => {
      if (!filterByRegion(up)) return;
      list.push({
        id: `up-${i}-${up.id || up.idsls_str || i}`,
        nama:
          up.nama_komersial ||
          up.nama_usaha_edit ||
          up["nama final"] ||
          up.nama_final ||
          up.nama_krt ||
          up.nm_project ||
          up.nama ||
          "Usaha Pertanian",
        alamat:
          up["alamat final"] ||
          up.alamat_final ||
          up.deskripsi_project ||
          up.alamat_project ||
          up.alamat ||
          "-",
        type: "usaha-pertanian",
        typeLabel: "Usaha Pertanian",
        badgeClass:
          "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400",
        iddesa: up.iddesa,
        idkec: up.idkec,
        detail: up.produk || up.keg_utama || up.komoditas || up.jenis_usaha || "Agrikultur",
      });
    });

    // 4. Rumah Tangga
    (dataRumahTangga || []).forEach((rt: any, i: number) => {
      if (!filterByRegion(rt)) return;
      list.push({
        id: `rt-${i}-${rt.id || rt.idsls_str || i}`,
        nama:
          rt["nama final"] ||
          rt.nama_final ||
          rt.nama_kk ||
          rt.nama ||
          rt.nama_kpl ||
          "KK",
        alamat:
          rt["alamat final"] ||
          rt.alamat_final ||
          rt.level_6_name ||
          rt["level_6_name"] ||
          rt.alamat_krt ||
          rt.alamat ||
          "-",
        type: "rt",
        typeLabel: "KK",
        badgeClass:
          "bg-blue-500/10 text-blue-500 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400",
        iddesa: rt.iddesa,
        idkec: rt.idkec,
        detail: rt.jenis_rt || rt.status_rt || "Unit KK",
      });
    });

    // 5. Bangunan Fisik
    (dataBangunan || []).forEach((b: any, i: number) => {
      if (!filterByRegion(b)) return;
      list.push({
        id: `b-${i}-${b.id_bangunan || i}`,
        nama:
          b.nama_bangunan || b.nama || `Bangunan #${b.id_bangunan || i + 1}`,
        alamat:
          b.alamat ||
          b.alamat_lengkap ||
          (b.idsls_str ? `SLS ${b.idsls_str}` : "-"),
        type: "bangunan",
        typeLabel: "Bangunan Fisik",
        badgeClass:
          "bg-indigo-500/10 text-indigo-500 border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-400",
        iddesa: b.iddesa,
        idkec: b.idkec,
        detail:
          b.status_kunjungan === "sudah"
            ? "Terkunjungi"
            : b.status_kunjungan === "belum"
              ? "Belum Dikunjungi"
              : "Bangunan Fisik",
      });
    });

    return list;
  }, [
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataBangunan,
    store.filterKecamatan,
    store.filterDesa,
    store.filterDusun,
    store.filterSls,
    parsedSlsMap,
  ]);

  /**
   * Menghitung total entitas per kategori tipe entitas.
   */
  const counts = useMemo<EntityCounts>(() => {
    const c: EntityCounts = {
      all: allEntities.length,
      usaha: 0,
      "usaha-digital": 0,
      "usaha-pertanian": 0,
      rt: 0,
      bangunan: 0,
    };
    allEntities.forEach((item) => {
      if (c[item.type] !== undefined) {
        c[item.type]++;
      }
    });
    return c;
  }, [allEntities]);

  /**
   * Memfilter daftar entitas berdasarkan tab kategori aktif dan query pencarian.
   */
  const filteredList = useMemo(() => {
    return allEntities.filter((item) => {
      // Tab filter
      if (activeTab !== "all" && item.type !== activeTab) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = item.nama.toLowerCase().includes(q);
        const matchAlamat = item.alamat.toLowerCase().includes(q);
        const matchDetail = (item.detail || "").toLowerCase().includes(q);
        return matchNama || matchAlamat || matchDetail;
      }
      return true;
    });
  }, [allEntities, activeTab, searchQuery]);

  /**
   * Mengkalkulasi total halaman pagination.
   */
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;

  /**
   * Memotong daftar terfilter sesuai dengan halaman pagination aktif.
   */
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  /**
   * Change tab and reset current page to 1.
   */
  const handleTabChange = (tab: EntityType) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  /**
   * Change search query and reset current page to 1.
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  /**
   * Export filtered data to CSV file format.
   */
  const handleExportCSV = () => {
    if (!isAdmin) return;
    const rows = filteredList.map((item, idx) => ({
      No: idx + 1,
      "Nama Entitas / Usaha": item.nama,
      "Alamat / Lokasi": item.alamat,
      "Kategori / Detail": item.detail || "-",
      "Tipe Entitas": item.typeLabel,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rincian_Entitas_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Export filtered data to Excel (.xlsx) workbook format.
   */
  const handleExportExcel = () => {
    if (!isAdmin) return;
    const rows = filteredList.map((item, idx) => ({
      No: idx + 1,
      "Nama Entitas / Usaha": item.nama,
      "Alamat / Lokasi": item.alamat,
      "Kategori / Detail": item.detail || "-",
      "Tipe Entitas": item.typeLabel,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Entitas");
    XLSX.writeFile(
      workbook,
      `Rincian_Entitas_${activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  return {
    allEntities,
    filteredList,
    paginatedData,
    counts,
    activeTab,
    searchQuery,
    currentPage,
    totalPages,
    itemsPerPage,
    isAdmin,
    handleTabChange,
    handleSearchChange,
    setSearchQuery,
    setCurrentPage,
    handleExportCSV,
    handleExportExcel,
  };
}
