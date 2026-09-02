/**
 * Helper Parser & Ekstraktor Struktur SLS (Satuan Lingkungan Setempat), Dusun, dan RT/RW.
 */

export interface ParsedSls {
  /** Kode unik SLS 14 digit */
  idslsStr: string;
  /** Nama SLS asli dari dataset */
  namaSls: string;
  /** Nama Dusun / Lingkungan yang berhasil di-ekstrak */
  dusun: string;
  /** Format RT / RW yang berhasil di-ekstrak */
  rtRw: string;
  /** Label ramah pengguna untuk dropdown (contoh: "RT 01 / RW 02 - DUSUN KRAJAN") */
  displayLabel: string;
}

/**
 * Normalisasi ID SLS: membersihkan spasi, trailing '.0', dan karakter whitespace.
 */
export function normalizeSlsId(rawId: any): string {
  if (rawId === null || rawId === undefined) return "";
  let str = String(rawId).trim();
  if (str.endsWith(".0")) {
    str = str.slice(0, -2);
  }
  return str;
}

/**
 * Ekstraksi ID SLS dari berbagai variasi nama field pada dataset titik/bangunan.
 */
export function getSlsId(row: any): string {
  if (!row) return "";
  const raw =
    row["idsls_str"] ||
    row["idsls final"] ||
    row["idsls_final"] ||
    row["idsls"] ||
    row["id_sls"] ||
    row["id_sls_final"] ||
    row["sls_id"] ||
    row["kode_sls"] ||
    row.properties?.idsls_str ||
    row.properties?.idsls ||
    row.properties?.id_sls ||
    "";
  return normalizeSlsId(raw);
}

/**
 * Memeriksa apakah dua kode SLS cocok (mendukung pencocokan exact dan 14-digit prefix).
 */
export function isSlsMatch(itemSlsId: string, targetSlsId: string): boolean {
  if (!itemSlsId || !targetSlsId) return false;
  const a = normalizeSlsId(itemSlsId);
  const b = normalizeSlsId(targetSlsId);
  if (a === b) return true;
  if (a.length >= 14 && b.length >= 14 && a.substring(0, 14) === b.substring(0, 14)) {
    return true;
  }
  return false;
}

/**
 * Parsing teks nama SLS menjadi nama Dusun dan nomor RT / RW.
 */
export function parseSlsName(namaSlsRaw: string, idslsStr: string): ParsedSls {
  const raw = (namaSlsRaw || `SLS ${idslsStr.slice(-4)}`).trim();

  // Ekstrak nama Dusun / Lingkungan / Dukuh / Kampung
  const dusunMatch = raw.match(
    /(?:DUSUN|DSN|LINGKUNGAN|LK|DUKUH|KAMPUNG)\s+[^,0-9(]+/i
  );

  // Ekstrak angka RT & RW
  const rtMatch = raw.match(/RT\s*\.?\s*(\d+)/i);
  const rwMatch = raw.match(/RW\s*\.?\s*(\d+)/i);

  let rtRw = "";
  if (rtMatch && rwMatch) {
    rtRw = `RT ${Number(rtMatch[1])} / RW ${Number(rwMatch[1])}`;
  } else if (rtMatch) {
    rtRw = `RT ${Number(rtMatch[1])}`;
  } else if (rwMatch) {
    rtRw = `RW ${Number(rwMatch[1])}`;
  }

  let dusun = dusunMatch ? dusunMatch[0].trim().toUpperCase() : "";

  // Jika tidak terdeteksi via keyword, bersihkan angka RT/RW untuk mencari nama wilayahnya
  if (!dusun) {
    const textWithoutRt = raw
      .replace(/RT\s*\.?\s*\d+/gi, "")
      .replace(/RW\s*\.?\s*\d+/gi, "")
      .replace(/[/\-,()]/g, "")
      .trim();

    if (textWithoutRt.length > 2) {
      dusun = textWithoutRt.toUpperCase();
    } else {
      dusun = "DUSUN UTAMA";
    }
  }

  if (!rtRw) {
    rtRw = `SLS ${idslsStr.slice(-4)}`;
  }

  return {
    idslsStr,
    namaSls: raw,
    dusun,
    rtRw,
    displayLabel: `${rtRw} (${dusun})`,
  };
}

/**
 * Ekstraksi daftar opsi Dusun dan opsi RT/RW (SLS) dari layer GeoJSON `dataSls`.
 */
export function extractDusunAndSlsList(
  dataSls: any,
  filterDesa: string | null,
  filterDusun: string | null
) {
  if (!dataSls || !dataSls.features) {
    return {
      dusunOptions: [],
      slsOptions: [],
      parsedSlsMap: new Map<string, ParsedSls>(),
    };
  }

  const parsedSlsMap = new Map<string, ParsedSls>();
  const dusunSet = new Set<string>();
  const allSlsInDesa: ParsedSls[] = [];

  dataSls.features.forEach((f: any, i: number) => {
    const props = f.properties || {};
    const idslsRaw =
      props.idsls_str ||
      props.idsls ||
      props.id_sls ||
      props.IDSLS ||
      props.kode_sls ||
      i + 1;
    const idslsStr = normalizeSlsId(idslsRaw);
    const iddesaRaw =
      props.iddesa || props.id_desa || idslsStr.substring(0, 10);
    const iddesa = normalizeSlsId(iddesaRaw);

    // Filter per Desa jika aktif
    if (
      filterDesa &&
      filterDesa !== "Semua" &&
      iddesa !== normalizeSlsId(filterDesa)
    ) {
      return;
    }

    const namaSls =
      props.nmsls ||
      props.nama_sls ||
      props.sls_name ||
      props.sls_nama ||
      props.dusun ||
      `SLS ${idslsStr.slice(-4)}`;

    const parsed = parseSlsName(namaSls, idslsStr);
    parsedSlsMap.set(idslsStr, parsed);
    if (idslsStr.length >= 14) {
      parsedSlsMap.set(idslsStr.substring(0, 14), parsed);
    }
    dusunSet.add(parsed.dusun);
    allSlsInDesa.push(parsed);
  });

  const dusunOptions = [
    { value: "Semua", label: "Semua Dusun" },
    ...Array.from(dusunSet)
      .sort()
      .map((d) => ({
        value: d,
        label: d,
      })),
  ];

  const filteredSls = allSlsInDesa.filter((item) => {
    if (!filterDusun || filterDusun === "Semua") return true;
    return item.dusun === filterDusun;
  });

  const slsOptions = [
    { value: "Semua", label: "Semua RT / RW" },
    ...filteredSls.map((s) => ({
      value: s.idslsStr,
      label: s.displayLabel,
    })),
  ];

  return { dusunOptions, slsOptions, parsedSlsMap };
}
