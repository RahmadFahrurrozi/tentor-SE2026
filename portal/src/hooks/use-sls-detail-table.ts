import { useState, useMemo } from "react";
import { useMapStore } from "@/store/mapStore";
import { useAuthStore } from "@/store/auth-store";
import * as XLSX from "xlsx";
import { getSlsId, isSlsMatch } from "@/utils/slsHelper";

/**
 * Interface item data agregat per SLS (Satuan Lingkungan Setempat).
 */
export interface SlsRowItem {
  /** Identifier unik baris SLS */
  id: string;
  /** Kode unik SLS dalam format string */
  idslsStr: string;
  /** Nama SLS atau sebutan wilayah SLS */
  namaSls: string;
  /** Kode ID Desa / Kelurahan */
  iddesa: string;
  /** Nama Desa / Kelurahan */
  namaDesa: string;
  /** Kode ID Kecamatan */
  idkec: string;
  /** Nama Kecamatan */
  namaKec: string;
  /** Total entitas Usaha Biasa di SLS ini */
  totalUsaha: number;
  /** Total entitas Usaha Digital di SLS ini */
  totalUsahaDigital: number;
  /** Total entitas Usaha Pertanian di SLS ini */
  totalUsahaPertanian: number;
  /** Total entitas Rumah Tangga (KRT) di SLS ini */
  totalRt: number;
  /** Total Bangunan Fisik terdaftar di SLS ini */
  totalBangunan: number;
  /** Jumlah bangunan yang sudah terdata/terkunjungi */
  sudahTerdata: number;
  /** Jumlah bangunan yang belum terdata/terkunjungi */
  belumTerdata: number;
  /** Persentase progress pendataan (0 - 100%) */
  progressPct: number;
}

/**
 * Interface entitas individual di dalam modal rincian SLS terpilih.
 */
export interface SlsEntityDetailItem {
  /** Identifier unik entitas */
  id: string;
  /** Nama entitas, usaha, atau kepala keluarga */
  nama: string;
  /** Alamat lengkap entitas */
  alamat: string;
  /** Tipe entitas terdaftar */
  type: "usaha" | "usaha-digital" | "usaha-pertanian" | "rt" | "bangunan";
  /** Label tipe entitas ramah pengguna */
  typeLabel: string;
  /** Class Tailwind CSS untuk styling badge tipe */
  badgeClass: string;
  /** Detail atau kategori tambahan */
  detail: string;
}

/**
 * Interface return value dari hook useSlsDetailTable.
 */
export interface UseSlsDetailTableReturn {
  /** Seluruh baris data SLS ter-agregasi berdasarkan filter Desa/Kecamatan */
  slsRows: SlsRowItem[];
  /** Data SLS terfilter sesuai pencarian */
  filteredSls: SlsRowItem[];
  /** Data SLS untuk halaman aktif saat ini */
  paginatedSls: SlsRowItem[];
  /** Kata kunci pencarian tabel SLS utama */
  searchQuery: string;
  /** Halaman pagination aktif (1-indexed) */
  currentPage: number;
  /** Total halaman pagination */
  totalPages: number;
  /** Jumlah SLS yang ditampilkan per halaman (default: 10) */
  itemsPerPage: number;
  /** SLS yang sedang dipilih untuk ditampilkan di dalam dialog modal (null jika modal tertutup) */
  selectedSls: SlsRowItem | null;
  /** Kata kunci pencarian entitas di dalam modal rincian SLS */
  modalSearchQuery: string;
  /** Tab kategori filter yang sedang aktif di dalam modal */
  modalActiveTab: string;
  /** Seluruh daftar entitas milik SLS yang sedang dipilih */
  slsEntities: SlsEntityDetailItem[];
  /** Daftar entitas di dalam modal yang sudah difilter oleh tab & pencarian modal */
  modalFilteredEntities: SlsEntityDetailItem[];
  /** Status apakah pengguna saat ini memiliki hak akses Admin */
  isAdmin: boolean;
  /** Function setter untuk memperbarui kata kunci pencarian utama */
  setSearchQuery: (query: string) => void;
  /** Handler onChange untuk input pencarian tabel utama */
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Function setter untuk memilih SLS dan membuka modal */
  setSelectedSls: (sls: SlsRowItem | null) => void;
  /** Function setter untuk kata kunci pencarian modal */
  setModalSearchQuery: (query: string) => void;
  /** Function setter untuk tab aktif di dalam modal */
  setModalActiveTab: (tab: string) => void;
  /** Setter untuk halaman pagination */
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  /** Handler untuk membuka modal rincian SLS tertentu */
  handleOpenSlsModal: (sls: SlsRowItem) => void;
  /** Handler untuk menutup modal rincian SLS */
  handleCloseSlsModal: () => void;
  /** Handler ekspor rekap SLS ke format CSV */
  handleExportCSV: () => void;
  /** Handler ekspor rekap SLS ke format Excel */
  handleExportExcel: () => void;
}

/**
 * Hook kustom `useSlsDetailTable`
 * 
 * Mengelola seluruh agregasi data spasial per SLS dan logika state untuk komponen `SlsDetailTable`:
 * 1. Agregasi hitungan entitas (Usaha, Digital, Pertanian, RT, Bangunan) per wilayah SLS
 * 2. Perhitungan progress pendataan kunjungan SLS
 * 3. Filter pencarian SLS & pagination tabel utama
 * 4. Pengambilan & ekstraksi rincian entitas individual untuk modal SLS terpilih
 * 5. Penyaringan tab & pencarian di dalam modal rincian SLS
 * 6. Ekspor laporan rekapitulasi SLS ke CSV dan Excel untuk Admin
 * 
 * @param spatialData Object dataset spasial yang memuat dataSls, dataUsaha, dataUsahaDigital, dataUsahaPertanian, dataRumahTangga, dataBangunan, dan wilayahManifest.
 * @returns Object `UseSlsDetailTableReturn` berisi data ter-agregasi dan handler interaktif.
 */
export function useSlsDetailTable(spatialData: any): UseSlsDetailTableReturn {
  const store = useMapStore();
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === "admin";

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedSls, setSelectedSls] = useState<SlsRowItem | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>("");
  const [modalActiveTab, setModalActiveTab] = useState<string>("all");

  const itemsPerPage = 10;

  const {
    dataSls,
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataBangunan,
    wilayahManifest,
  } = spatialData || {};

  /**
   * Agregasi data SLS dari GeoJSON features dan dataset pendukung.
   */
  const slsRows = useMemo<SlsRowItem[]>(() => {
    if (!dataSls || !dataSls.features) return [];

    // Helper map nama kecamatan & desa dari manifest
    const kecMap: Record<string, string> = {};
    const desaMap: Record<string, string> = {};
    (wilayahManifest?.kecamatan || []).forEach((k: any) => {
      kecMap[String(k.idkec)] = k.nmkec || k.nama || `Kec ${k.idkec}`;
      (k.desa || []).forEach((d: any) => {
        desaMap[String(d.iddesa)] = d.nmdesa || d.nama || `Desa ${d.iddesa}`;
      });
    });

    const countMapUsaha: Record<string, number> = {};
    const countMapDigital: Record<string, number> = {};
    const countMapPertanian: Record<string, number> = {};
    const countMapRt: Record<string, number> = {};
    const countMapBangunan: Record<string, number> = {};
    const bangunanStats: Record<string, { sudah: number; belum: number }> = {};

    const registerCount = (acc: Record<string, number>, item: any) => {
      const key = getSlsId(item);
      if (!key) return;
      acc[key] = (acc[key] || 0) + 1;
      if (key.length >= 14) {
        const key14 = key.substring(0, 14);
        if (key14 !== key) {
          acc[key14] = (acc[key14] || 0) + 1;
        }
      }
    };

    const registerBangunan = (item: any) => {
      const key = getSlsId(item);
      if (!key) return;
      countMapBangunan[key] = (countMapBangunan[key] || 0) + 1;

      const status = item.status_bangunan || item.status || "";
      const isSudah =
        status && status !== "Belum Terdata" && status !== "belum";

      const updateStat = (k: string) => {
        if (!bangunanStats[k]) bangunanStats[k] = { sudah: 0, belum: 0 };
        if (isSudah) bangunanStats[k].sudah++;
        else bangunanStats[k].belum++;
      };

      updateStat(key);

      if (key.length >= 14) {
        const key14 = key.substring(0, 14);
        if (key14 !== key) {
          countMapBangunan[key14] = (countMapBangunan[key14] || 0) + 1;
          updateStat(key14);
        }
      }
    };

    (dataUsaha || []).forEach((u: any) => registerCount(countMapUsaha, u));
    (dataUsahaDigital || []).forEach((ud: any) => registerCount(countMapDigital, ud));
    (dataUsahaPertanian || []).forEach((up: any) => registerCount(countMapPertanian, up));
    (dataRumahTangga || []).forEach((rt: any) => registerCount(countMapRt, rt));
    (dataBangunan || []).forEach((b: any) => registerBangunan(b));

    const rows: SlsRowItem[] = [];

    dataSls.features.forEach((f: any, i: number) => {
      const props = f.properties || {};
      const idslsStr = getSlsId(f) || String(props.idsls_str || props.idsls || i + 1);
      const idsls14 = idslsStr.length >= 14 ? idslsStr.substring(0, 14) : idslsStr;

      const iddesa = String(
        props.iddesa || props.id_desa || idslsStr.substring(0, 10),
      );
      const idkec = String(
        props.idkec || props.id_kec || idslsStr.substring(0, 7),
      );

      if (store.filterDesa !== "Semua" && store.filterDesa) {
        if (iddesa !== String(store.filterDesa)) return;
      }

      const namaSls =
        props.nmsls ||
        props.nama_sls ||
        props.sls_name ||
        props.sls_nama ||
        `SLS ${idslsStr.slice(-4)}`;
      const namaDesa =
        props.nmdesa || desaMap[iddesa] || `Desa ${iddesa.slice(-3)}`;
      const namaKec = props.nmkec || kecMap[idkec] || `Kec ${idkec.slice(-3)}`;

      const totalUsaha =
        props.jumlah_usaha ??
        props.count_usaha ??
        countMapUsaha[idslsStr] ??
        countMapUsaha[idsls14] ??
        0;
      const totalUsahaDigital =
        props.jumlah_usaha_digital ??
        props.count_usaha_digital ??
        countMapDigital[idslsStr] ??
        countMapDigital[idsls14] ??
        0;
      const totalUsahaPertanian =
        props.jumlah_usaha_pertanian ??
        props.count_usaha_pertanian ??
        countMapPertanian[idslsStr] ??
        countMapPertanian[idsls14] ??
        0;
      const totalRt =
        props.jumlah_keluarga ??
        props.count_rt ??
        countMapRt[idslsStr] ??
        countMapRt[idsls14] ??
        0;

      const bStat = bangunanStats[idslsStr] || bangunanStats[idsls14];
      const totalBangunan =
        props.total_bangunan ??
        props.count_bangunan ??
        (bStat ? bStat.sudah + bStat.belum : (countMapBangunan[idslsStr] ?? countMapBangunan[idsls14] ?? 0));

      const sudahTerdata =
        props.sudah_terdata !== undefined
          ? props.sudah_terdata
          : (bStat ? bStat.sudah : 0);

      const belumTerdata =
        props.belum_terdata !== undefined
          ? props.belum_terdata
          : (bStat ? bStat.belum : Math.max(0, totalBangunan - sudahTerdata));

      const progressPct =
        totalBangunan > 0
          ? Math.round((sudahTerdata / totalBangunan) * 100)
          : 0;

      rows.push({
        id: `sls-${idslsStr}-${i}`,
        idslsStr,
        namaSls,
        iddesa,
        namaDesa,
        idkec,
        namaKec,
        totalUsaha,
        totalUsahaDigital,
        totalUsahaPertanian,
        totalRt,
        totalBangunan,
        sudahTerdata,
        belumTerdata,
        progressPct,
      });
    });

    return rows;
  }, [
    dataSls,
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataBangunan,
    wilayahManifest,
    store.filterDesa,
  ]);

  /**
   * Memfilter baris SLS berdasarkan query pencarian teks.
   */
  const filteredSls = useMemo(() => {
    if (!searchQuery.trim()) return slsRows;
    const q = searchQuery.toLowerCase();
    return slsRows.filter(
      (r) =>
        r.namaSls.toLowerCase().includes(q) ||
        r.idslsStr.toLowerCase().includes(q) ||
        r.namaDesa.toLowerCase().includes(q) ||
        r.namaKec.toLowerCase().includes(q),
    );
  }, [slsRows, searchQuery]);

  /**
   * Menghitung total halaman tabel SLS.
   */
  const totalPages = Math.ceil(filteredSls.length / itemsPerPage) || 1;

  /**
   * Mengambil potongan data SLS untuk halaman aktif saat ini.
   */
  const paginatedSls = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSls.slice(start, start + itemsPerPage);
  }, [filteredSls, currentPage]);

  /**
   * Ekstraksi seluruh entitas individual yang berada di dalam SLS yang terpilih.
   */
  const slsEntities = useMemo<SlsEntityDetailItem[]>(() => {
    if (!selectedSls) return [];
    const targetSls = selectedSls.idslsStr;

    const list: SlsEntityDetailItem[] = [];

    // Usaha Biasa
    (dataUsaha || []).forEach((u: any, i: number) => {
      const itemSls = getSlsId(u);
      if (isSlsMatch(itemSls, targetSls)) {
        list.push({
          id: `ub-${i}`,
          nama: u["nama final"] || u.nama_final || u.nama_usaha_edit || u.nama || "Usaha Biasa",
          alamat: u["alamat final"] || u.alamat_final || u.alamat || "-",
          type: "usaha",
          typeLabel: "Usaha Biasa",
          badgeClass:
            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
          detail: u.kategori || u.jenis_usaha || u.keg_utama || "Non-Pertanian",
        });
      }
    });

    // Usaha Digital
    (dataUsahaDigital || []).forEach((ud: any, i: number) => {
      const itemSls = getSlsId(ud);
      if (isSlsMatch(itemSls, targetSls)) {
        list.push({
          id: `ud-${i}`,
          nama: ud["nama final"] || ud.nama_final || ud.nama_usaha_edit || ud.nama || "Usaha Digital",
          alamat: ud["alamat final"] || ud.alamat_final || ud.alamat || "-",
          type: "usaha-digital",
          typeLabel: "Usaha Digital",
          badgeClass:
            "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30",
          detail: ud.kategori || ud.jenis_usaha || "E-Commerce",
        });
      }
    });

    // Usaha Pertanian
    (dataUsahaPertanian || []).forEach((up: any, i: number) => {
      const itemSls = getSlsId(up);
      if (isSlsMatch(itemSls, targetSls)) {
        list.push({
          id: `up-${i}`,
          nama:
            up.nama_komersial ||
            up.nama_usaha_edit ||
            up["nama final"] ||
            up.nama_final ||
            up.nama_krt ||
            up.nama ||
            "Usaha Pertanian",
          alamat:
            up["alamat final"] ||
            up.alamat_final ||
            up.deskripsi_project ||
            up.alamat ||
            "-",
          type: "usaha-pertanian",
          typeLabel: "Usaha Pertanian",
          badgeClass:
            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          detail: up.produk || up.keg_utama || up.komoditas || up.kategori || "Agrikultur",
        });
      }
    });

    // Rumah Tangga
    (dataRumahTangga || []).forEach((rt: any, i: number) => {
      const itemSls = getSlsId(rt);
      if (isSlsMatch(itemSls, targetSls)) {
        list.push({
          id: `rt-${i}`,
          nama:
            rt["nama final"] || rt.nama_final || rt.nama_kk || "KK",
          alamat:
            rt["alamat final"] ||
            rt.alamat_final ||
            rt.level_6_name ||
            rt["level_6_name"] ||
            rt.alamat_krt ||
            "-",
          type: "rt",
          typeLabel: "KK",
          badgeClass:
            "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
          detail: rt.jenis_rt || "Unit KK",
        });
      }
    });

    // Bangunan Fisik
    (dataBangunan || []).forEach((b: any, i: number) => {
      const itemSls = getSlsId(b);
      if (isSlsMatch(itemSls, targetSls)) {
        list.push({
          id: `b-${i}`,
          nama: b.nama_bangunan || b.nama || `Bangunan #${i + 1}`,
          alamat: b.alamat || b.alamat_lengkap || "-",
          type: "bangunan",
          typeLabel: "Bangunan Fisik",
          badgeClass:
            "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
          detail:
            b.status_bangunan ||
            (b.status_kunjungan === "sudah" ? "Terkunjungi" : "Belum Dikunjungi"),
        });
      }
    });

    return list;
  }, [
    selectedSls,
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataBangunan,
  ]);

  /**
   * Memfilter daftar entitas modal SLS berdasarkan tab tipe aktif dan kata kunci pencarian modal.
   */
  const modalFilteredEntities = useMemo(() => {
    return slsEntities.filter((item) => {
      if (modalActiveTab !== "all" && item.type !== modalActiveTab)
        return false;
      if (modalSearchQuery.trim()) {
        const q = modalSearchQuery.toLowerCase();
        return (
          item.nama.toLowerCase().includes(q) ||
          item.alamat.toLowerCase().includes(q) ||
          item.detail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [slsEntities, modalActiveTab, modalSearchQuery]);

  /**
   * Handler perubahan input pencarian tabel SLS utama.
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  /**
   * Membuka modal detail SLS tertentu dan mereset filter modal.
   */
  const handleOpenSlsModal = (sls: SlsRowItem) => {
    setSelectedSls(sls);
    setModalSearchQuery("");
    setModalActiveTab("all");
  };

  /**
   * Menutup modal detail SLS.
   */
  const handleCloseSlsModal = () => {
    setSelectedSls(null);
  };

  /**
   * Ekspor rekap data SLS terfilter ke CSV (Admin Only).
   */
  const handleExportCSV = () => {
    if (!isAdmin) return;
    const exportRows = filteredSls.map((r, idx) => ({
      No: idx + 1,
      "Kode SLS": r.idslsStr,
      "Nama SLS": r.namaSls,
      "Desa / Kelurahan": r.namaDesa,
      Kecamatan: r.namaKec,
      "Usaha Biasa": r.totalUsaha,
      "Usaha Digital": r.totalUsahaDigital,
      "Usaha Pertanian": r.totalUsahaPertanian,
      KK: r.totalRt,
      "Total Bangunan": r.totalBangunan,
      "Sudah Terdata": r.sudahTerdata,
      "Progress (%)": `${r.progressPct}%`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rekap_SLS_${store.filterKecamatan}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Ekspor rekap data SLS terfilter ke Excel (.xlsx) (Admin Only).
   */
  const handleExportExcel = () => {
    if (!isAdmin) return;
    const exportRows = filteredSls.map((r, idx) => ({
      No: idx + 1,
      "Kode SLS": r.idslsStr,
      "Nama SLS": r.namaSls,
      "Desa / Kelurahan": r.namaDesa,
      Kecamatan: r.namaKec,
      "Usaha Biasa": r.totalUsaha,
      "Usaha Digital": r.totalUsahaDigital,
      "Usaha Pertanian": r.totalUsahaPertanian,
      KK: r.totalRt,
      "Total Bangunan": r.totalBangunan,
      "Sudah Terdata": r.sudahTerdata,
      "Progress (%)": `${r.progressPct}%`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap SLS");
    XLSX.writeFile(
      workbook,
      `Rekap_SLS_${store.filterKecamatan}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  return {
    slsRows,
    filteredSls,
    paginatedSls,
    searchQuery,
    currentPage,
    totalPages,
    itemsPerPage,
    selectedSls,
    modalSearchQuery,
    modalActiveTab,
    slsEntities,
    modalFilteredEntities,
    isAdmin,
    setSearchQuery,
    handleSearchChange,
    setSelectedSls,
    setModalSearchQuery,
    setModalActiveTab,
    setCurrentPage,
    handleOpenSlsModal,
    handleCloseSlsModal,
    handleExportCSV,
    handleExportExcel,
  };
}
