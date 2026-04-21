export interface Region {
  kecamatan: string;
  desa: string[];
}

export const REGIONS: Region[] = [
  {
    kecamatan: "PESANGGARAN",
    desa: ["KANDANGAN", "PESANGGARAN", "SARONGAN", "SUMBERAGUNG", "SUMBERMULYO"],
  },
  {
    kecamatan: "BANGOREJO",
    desa: ["BANGOREJO", "KEBONDALEM", "RINGINTELU", "SAMBIBULU", "SUKOREJO", "TEMUREJO"],
  },
  {
    kecamatan: "PURWOHARJO",
    desa: ["BULUREJO", "GLAGAHAGUNG", "GRAJAGAN", "KARENGREJO", "PURWOHARJO", "SIDOREJO", "SUMBERASRI"],
  },
  {
    kecamatan: "TEGALDLIMO",
    desa: ["KALIPAIT", "KEDUNGASRI", "KEDUNGGEBANG", "KEDUNGWUNGU", "KENDALREJO", "PURWOAGUNG", "PURWOSARI", "TEGALDLIMO", "TEGALSARI"],
  },
  {
    kecamatan: "GENTENG",
    desa: ["GENTENG KULON", "GENTENG WETAN", "KALIGONDO", "KEMIRI", "SETEL"],
  },
  {
    kecamatan: "KALIPURO",
    desa: ["BULUSAN", "GOMBENG SARI", "KALIPURO", "KETEPI", "MUATAN", "PELESARI", "SAYUAN", "TELEMUNG"],
  },
  {
    kecamatan: "LICIN",
    desa: ["GUMUK", "LICIN", "PAKEL", "SEGOBO", "TAMANSARI"],
  },
];
