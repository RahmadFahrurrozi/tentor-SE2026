import { useMemo, type ComponentProps } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Button } from "@/components/ui/button";
import {
  Eraser,
  LogOut,
  ArrowLeftRight,
  Database,
  Layers,
  Filter,
  ShieldAlert,
  Search,
  type LucideIcon,
} from "lucide-react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useSidebarControls } from "@/hooks/use-sidebar-controls";
import { AVAILABLE_BASEMAPS, type BasemapId } from "@/config/mapStyles";
import { REGIONS } from "@/config/regionConfig";
import type { KabupatenId } from "@/store/mapStore";

/* ────────────────────────────── Types ────────────────────────────── */

interface SidebarControlsProps {
  /** Tipe diambil dari hook, jadi tanpa `any` */
  spatialData: Parameters<typeof useSidebarControls>[0];
}

interface KecRow {
  idkec: string;
  nmkec?: string;
  nama?: string;
  name?: string;
}

interface DesaRow {
  iddesa: string;
  nmdesa?: string;
  nama?: string;
  name?: string;
}

type FilterKey =
  | "filterKecamatan"
  | "filterDesa"
  | "filterDusun"
  | "filterSls";

type ComboOptions = ComponentProps<typeof SearchableCombobox>["options"];

interface FilterLevel {
  key: FilterKey;
  label: string;
  options: ComboOptions;
  placeholder: string;
  emptyText: string;
  disabled: boolean;
}

type LayerKey =
  | "showKab"
  | "showSls"
  | "enable3d"
  | "showSyntheticBuildings"
  | "showUsaha"
  | "showUsahaDigital"
  | "showUsahaPertanian"
  | "showRt"
  | "showBangunanLainnya";

interface LayerToggle {
  key: LayerKey;
  label: string;
  /** Sub-opsi (menjorok, teks lebih redup) */
  indent?: boolean;
  /** Dikunci permanen (sama seperti perilaku lama untuk Batas SLS) */
  locked?: boolean;
  /** Hanya aktif bila layer bangunan menyala */
  needsBuild?: boolean;
}

interface QcToggle {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  muted?: boolean;
}

/* ────────────────────────────── Constants ────────────────────────────── */

const LAYER_TOGGLES: LayerToggle[] = [
  { key: "showKab", label: "Batas kabupaten" },
  { key: "showSls", label: "Batas SLS", locked: true },
  { key: "enable3d", label: "Mode 3D extrusion", indent: true, needsBuild: true },
  { key: "showSyntheticBuildings", label: "Bangunan sintetis" },
  { key: "showUsaha", label: "Titik usaha biasa" },
  { key: "showUsahaDigital", label: "Titik usaha digital" },
  { key: "showUsahaPertanian", label: "Titik usaha pertanian" },
  { key: "showRt", label: "Titik keluarga (KK)" },
  { key: "showBangunanLainnya", label: "Titik bangunan lainnya" },
];

/* ────────────────────────────── Small pieces ────────────────────────────── */

// Kepala seksi sidebar: ikon + judul kecil, dipisah hairline dari seksi berikutnya
function Section({
  icon: Icon,
  title,
  right,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-4 border-b space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
          {title}
        </h4>
        {right}
      </div>
      {children}
    </section>
  );
}

// Satu baris switch: label kiri, switch kanan
function ToggleRow({
  id,
  label,
  checked,
  onChange,
  disabled,
  muted,
  indent,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  muted?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        indent ? "pl-4" : ""
      } ${disabled ? "opacity-50" : ""}`}
    >
      <Label
        htmlFor={id}
        className={`text-[13px] font-normal ${
          muted ? "text-muted-foreground" : "text-foreground"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        {indent && <span className="mr-1 text-muted-foreground">↳</span>}
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

// Label field filter
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[11px] font-medium text-muted-foreground">
      {children}
    </Label>
  );
}

/* ────────────────────────────── Component ────────────────────────────── */

export function SidebarControls({ spatialData }: SidebarControlsProps) {
  const {
    store,
    role,
    desaOptions,
    kecOptions,
    dusunOptions,
    slsOptions,
    handleResetFilter,
    logout,
    isLoggingOut,
    userEmail,
    userFullName,
    userInitials,
    displayRole,
    regionAccess,
  } = useSidebarControls(spatialData);

  const kecamatanOptions = useMemo(
    () => [
      ...(role === "admin"
        ? [{ value: "Semua", label: "Semua Kecamatan" }]
        : []),
      ...kecOptions.map((k: KecRow) => ({
        value: k.idkec,
        label: k.nmkec || k.nama || k.name || k.idkec,
      })),
    ],
    [role, kecOptions],
  );

  const desaListOptions = useMemo(
    () => [
      { value: "Semua", label: "Semua Desa" },
      ...desaOptions.map((d: DesaRow) => ({
        value: d.iddesa,
        label: d.nmdesa || d.nama || d.name || d.iddesa,
      })),
    ],
    [desaOptions],
  );

  const isSe2026 = store.activeDatasetVersion === "se2026";
  const hasPrelist = !!REGIONS[store.selectedKabupaten]?.hasPrelist;

  // Empat level filter wilayah (urutan = hirarki)
  const levels: FilterLevel[] = [
    {
      key: "filterKecamatan",
      label: "Kecamatan",
      options: kecamatanOptions,
      placeholder: "Pilih Kecamatan...",
      emptyText: "Kecamatan tidak ditemukan.",
      disabled: false,
    },
    {
      key: "filterDesa",
      label: "Desa / Kelurahan",
      options: desaListOptions,
      placeholder: "Pilih Desa...",
      emptyText: "Desa tidak ditemukan.",
      disabled:
        !store.filterKecamatan ||
        store.filterKecamatan === "Semua" ||
        desaOptions.length === 0,
    },
    {
      key: "filterDusun",
      label: "Dusun / Lingkungan",
      options: dusunOptions,
      placeholder: "Pilih Dusun...",
      emptyText: "Dusun tidak ditemukan.",
      disabled:
        !store.filterDesa ||
        store.filterDesa === "Semua" ||
        dusunOptions.length <= 1,
    },
    {
      key: "filterSls",
      label: "RT / RW (SLS)",
      options: slsOptions,
      placeholder: "Pilih RT / RW...",
      emptyText: "RT / RW tidak ditemukan.",
      disabled:
        !store.filterDesa ||
        store.filterDesa === "Semua" ||
        slsOptions.length <= 1,
    },
  ];

  // Ubah satu level, reset semua level di bawahnya ke "Semua"
  const handleLevelChange = (index: number, val: string): void => {
    store.setFilter(levels[index].key, val);
    levels.slice(index + 1).forEach((l) => store.setFilter(l.key, "Semua"));
  };

  // Toggle QC (handler-nya beda-beda per item, jadi didefinisikan di sini)
  const qcAnomaly: QcToggle[] = [
    {
      id: "highlightAnomalies",
      label: "Sorot titik luar batas",
      checked: store.highlightAnomalies,
      onChange: () => store.toggleHighlightAnomalies(),
    },
    {
      id: "filterOnlyAnomalies",
      label: "Hanya titik luar batas",
      checked: store.filterOnlyAnomalies,
      onChange: () => store.toggleFilterOnlyAnomalies(),
      muted: true,
    },
  ];

  const qcCluster: QcToggle[] = [
    {
      id: "highlightClusters",
      label: "Sorot titik bergerombol",
      checked: store.highlightClusters,
      onChange: () => store.toggleHighlightClusters(),
    },
    {
      id: "filterOnlyClusters",
      label: "Hanya titik bergerombol",
      checked: store.filterOnlyClusters,
      onChange: () => store.toggleFilterOnlyClusters(),
      muted: true,
    },
  ];

  // Chip role: dibedakan lewat dot (admin = primary penuh, pml = sedang, ppl = redup)
  const roleDot =
    role === "admin"
      ? "bg-primary"
      : role === "pml"
        ? "bg-primary/55"
        : "bg-muted-foreground/50";

  return (
    <div className="h-full w-full max-w-75 flex flex-col border-r bg-background">
      {/* ── Header: logo + judul + toggle tema ── */}
      <div className="h-14 shrink-0 px-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/logo.svg"
            alt="BPS Logo"
            className="w-7 h-7 object-contain"
          />
          <span className="text-base font-semibold tracking-tight">
            TENTORING
          </span>
        </div>
        <ModeToggle />
      </div>

      {/* ── Body scrollable ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Versi dataset */}
        <Section
          icon={Database}
          title="Versi dataset"
          right={
            // Warna badge versi sengaja dipertahankan: SE 2026 = hijau, Prelist = oranye
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                isSe2026
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {isSe2026 ? "SE 2026" : "Prelist"}
            </span>
          }
        >
          {/* Segmented control: aktif = putih terangkat, dot sesuai warna versi */}
          <div className="grid grid-cols-2 gap-1 rounded-md border bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => store.setDatasetVersion("prelist")}
              disabled={!hasPrelist}
              aria-pressed={!isSe2026}
              className={`inline-flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 ${
                !isSe2026
                  ? "bg-background text-foreground shadow-sm border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Baseline prelist
            </button>
            <button
              type="button"
              onClick={() => store.setDatasetVersion("se2026")}
              aria-pressed={isSe2026}
              className={`inline-flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                isSe2026
                  ? "bg-background text-foreground shadow-sm border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              SE 2026 baru
            </button>
          </div>

          {!hasPrelist && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
              {REGIONS[store.selectedKabupaten]?.name || "Wilayah ini"} hanya
              menyediakan data SE 2026 terbaru (tanpa Prelist).
            </p>
          )}

          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-8 gap-1.5"
            onClick={() => store.setCompareMode(!store.isCompareMode)}
            disabled={!hasPrelist}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-primary" />
            {store.isCompareMode ? "Tutup komparasi" : "Mode komparasi"}
          </Button>
        </Section>

        {/* Basemap */}
        <Section icon={Layers} title="Basemap">
          <Select
            value={store.selectedBasemap}
            onValueChange={(val) => store.setBasemap(val as BasemapId)}
          >
            <SelectTrigger className="w-full h-8 text-xs bg-background">
              <SelectValue placeholder="Pilih basemap" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_BASEMAPS.map((bm) => (
                <SelectItem key={bm.id} value={bm.id} className="text-xs">
                  <div className="flex flex-col text-left">
                    <span className="font-medium">{bm.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {bm.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>

        {/* Visibilitas layer */}
        <Section icon={Layers} title="Layer peta">
          <div className="space-y-3">
            {LAYER_TOGGLES.map((t) => (
              <ToggleRow
                key={t.key}
                id={t.key}
                label={t.label}
                checked={store[t.key]}
                onChange={() => store.toggleLayer(t.key)}
                disabled={t.locked || (t.needsBuild && !store.showBuild)}
                muted={t.indent}
                indent={t.indent}
              />
            ))}
          </div>
        </Section>

        {/* QC: dua kelompok, dipisah garis tipis */}
        <Section icon={ShieldAlert} title="Kualitas spasial (QC)">
          <div className="space-y-3">
            {qcAnomaly.map((t) => (
              <ToggleRow
                key={t.id}
                id={t.id}
                label={t.label}
                checked={t.checked}
                onChange={t.onChange}
                muted={t.muted}
              />
            ))}
          </div>
          <div className="space-y-3 pt-3 border-t">
            {qcCluster.map((t) => (
              <ToggleRow
                key={t.id}
                id={t.id}
                label={t.label}
                checked={t.checked}
                onChange={t.onChange}
                muted={t.muted}
              />
            ))}
          </div>
        </Section>

        {/* Filter wilayah */}
        <Section icon={Filter} title="Filter wilayah">
          <div className="space-y-1.5">
            <FieldLabel>Kabupaten / kota</FieldLabel>
            <Select
              value={store.selectedKabupaten}
              onValueChange={(val) => store.setKabupaten(val as KabupatenId)}
              disabled={!!regionAccess.lockedKabupaten}
            >
              <SelectTrigger className="w-full h-8 text-xs font-medium">
                <SelectValue placeholder="Pilih kabupaten / kota" />
              </SelectTrigger>
              <SelectContent>
                {regionAccess.allowedKabupaten.map((kabId) => (
                  <SelectItem key={kabId} value={kabId} className="text-xs">
                    {REGIONS[kabId]?.name || kabId} ({kabId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {regionAccess.lockedKabupaten && (
              <p className="text-[11px] text-muted-foreground leading-snug">
                Hak akses wilayah{" "}
                <span className="font-medium text-foreground">
                  {REGIONS[regionAccess.lockedKabupaten]?.name}
                </span>
                .
              </p>
            )}
          </div>

          {/* Empat combobox dari array levels */}
          {levels.map((level, i) => (
            <div key={level.key} className="space-y-1.5">
              <FieldLabel>{level.label}</FieldLabel>
              <SearchableCombobox
                options={level.options}
                value={store[level.key] || undefined}
                placeholder={level.placeholder}
                emptyText={level.emptyText}
                disabled={level.disabled}
                onValueChange={(val) => handleLevelChange(i, val)}
              />
            </div>
          ))}
        </Section>

        {/* Pencarian + reset */}
        <Section icon={Search} title="Pencarian">
          <div className="space-y-1.5">
            <FieldLabel>Cari nama usaha</FieldLabel>
            <Input
              placeholder="contoh: BAKSO"
              value={store.filterNama}
              onChange={(e) => store.setFilter("filterNama", e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 gap-1.5"
            onClick={handleResetFilter}
          >
            <Eraser className="h-3.5 w-3.5 text-primary" />
            Reset filter
          </Button>
        </Section>
      </div>

      {/* ── Footer: profil + logout ── */}
      <div className="shrink-0 border-t bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-md border bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] font-medium text-foreground truncate"
              title={userFullName}
            >
              {userFullName}
            </p>
            <p
              className="text-[11px] text-muted-foreground truncate"
              title={userEmail}
            >
              {userEmail}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground shrink-0">
            <span className={`h-1.5 w-1.5 rounded-full ${roleDot}`} />
            {displayRole}
          </span>
        </div>

        <Button
          variant="outline"
          className="w-full text-xs h-8 gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400"
          onClick={() => logout()}
          disabled={isLoggingOut}
        >
          <LogOut className="h-3.5 w-3.5" />
          {isLoggingOut ? "Keluar..." : "Logout"}
        </Button>
      </div>
    </div>
  );
}