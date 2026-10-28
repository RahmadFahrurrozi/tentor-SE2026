import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BookOpen,
  MapPin,
  BarChart3,
  Layers,
  CheckCircle2,
  Zap,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Store,
  Laptop,
  Sprout,
  Home,
  Building2,
  FileSpreadsheet,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ────────────────────────────── Types ────────────────────────────── */

interface Step {
  id: number;
  title: string;
  shortTitle: string;
  description: string;
  icon: LucideIcon;
}

interface InfoItem {
  title: string;
  desc: string;
  icon: LucideIcon;
}

interface FilterStep {
  title: string;
  desc: string;
}

interface RoleRow {
  role: string;
  scope: string;
  comparison: boolean;
  exportData: boolean;
}

/* ────────────────────────────── Data ────────────────────────────── */

const STEPS: Step[] = [
  {
    id: 1,
    title: "Pengenalan layer spasial",
    shortTitle: "Layer spasial",
    description: "Titik usaha, rumah tangga, bangunan, dan SLS",
    icon: Layers,
  },
  {
    id: 2,
    title: "Navigasi & filter wilayah",
    shortTitle: "Filter wilayah",
    description: "Filter kecamatan, desa/kelurahan, dan pencarian nama",
    icon: MapPin,
  },
  {
    id: 3,
    title: "Statistik & insight monitoring",
    shortTitle: "Panel statistik",
    description: "Metrik KPI, chart, tabel data, dan export Excel",
    icon: BarChart3,
  },
  {
    id: 4,
    title: "Mode komparasi & hak akses",
    shortTitle: "Role & komparasi",
    description: "Dataset SE2026 vs Prelist dan wewenang tiap role",
    icon: ShieldCheck,
  },
];

const LAYERS: InfoItem[] = [
  {
    title: "Titik usaha biasa",
    desc: "Usaha fisik sektor non-pertanian: toko, warung, pabrik, bengkel, ruko, restoran.",
    icon: Store,
  },
  {
    title: "Titik usaha digital",
    desc: "Usaha berbasis e-commerce, toko online, marketplace, atau layanan digital.",
    icon: Laptop,
  },
  {
    title: "Titik usaha pertanian",
    desc: "Objek usaha agrikultur, lahan tani, perikanan, peternakan, dan kehutanan.",
    icon: Sprout,
  },
  {
    title: "Titik rumah tangga",
    desc: "Unit kediaman keluarga (KK) terdaftar hasil pencacahan SLS.",
    icon: Home,
  },
];

const FILTER_STEPS: FilterStep[] = [
  {
    title: "Pilih Kecamatan",
    desc: "Pilih nama Kecamatan pada dropdown filter di sidebar kiri atau di header panel statistik.",
  },
  {
    title: "Pilih Desa/Kelurahan",
    desc: "Setelah Kecamatan dipilih, dropdown Desa/Kelurahan aktif untuk memfilter satu desa secara spesifik.",
  },
  {
    title: "Cari nama usaha / KRT",
    desc: "Ketik nama usaha (contoh: BAKSO, WARUNG) atau nama KRT di kolom pencarian untuk menyaring titik di peta secara instan.",
  },
  {
    title: "Reset filter",
    desc: "Klik tombol Reset Filter di sidebar untuk mengembalikan semua filter ke posisi awal.",
  },
];

const STATS: InfoItem[] = [
  {
    title: "Status kunjungan (% progress)",
    desc: "Pie chart dan ring donut memperlihatkan proporsi bangunan yang sudah dikunjungi vs belum dikunjungi di lapangan.",
    icon: CheckCircle2,
  },
  {
    title: "Sebaran entitas terdata",
    desc: "Bar chart membandingkan jumlah Usaha Biasa, Digital, Pertanian, dan Unit Rumah Tangga di wilayah terpilih.",
    icon: BarChart3,
  },
  {
    title: "Export Excel & CSV",
    desc: "Khusus role Admin: unduh rekapitulasi data spasial ke format .xlsx atau .csv.",
    icon: FileSpreadsheet,
  },
];

const ROLES: RoleRow[] = [
  {
    role: "Admin",
    scope: "Seluruh Kabupaten Banyuwangi",
    comparison: true,
    exportData: true,
  },
  {
    role: "PML (Pengawas)",
    scope: "Kecamatan & desa penugasan",
    comparison: true,
    exportData: false,
  },
  {
    role: "PPL (Petugas)",
    scope: "Desa penugasan spesifik",
    comparison: true,
    exportData: false,
  },
];

// Angka pakai font mono + tabular-nums (konsisten dengan panel statistik)
const NUM = "font-mono tabular-nums";

/* ────────────────────────────── Small pieces ────────────────────────────── */

// Daftar item berhairline: ikon di kotak kecil, judul, deskripsi. Dipakai step 1 & 3
function InfoList({ items }: { items: InfoItem[] }) {
  return (
    <div className="rounded-lg border divide-y overflow-hidden bg-background">
      {items.map((item) => (
        <div
          key={item.title}
          className="flex items-start gap-3.5 p-4 hover:bg-muted/30 transition-colors"
        >
          <div className="h-8 w-8 shrink-0 rounded-md border bg-primary/5 text-primary flex items-center justify-center">
            <item.icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-foreground">
              {item.title}
            </h4>
            <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
              {item.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Callout: kotak biru muda dengan ikon di kiri
function Callout({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
      <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div className="text-[13px] leading-relaxed text-muted-foreground">
        <p className="text-sm font-medium text-foreground mb-0.5">{title}</p>
        {children}
      </div>
    </div>
  );
}

// Penanda boolean di tabel hak akses
function Access({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
      <Check className="w-3.5 h-3.5" /> Akses penuh
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <X className="w-3.5 h-3.5" /> Khusus Admin
    </span>
  );
}

/* ────────────────────────────── Page ────────────────────────────── */

export default function DocumentationPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1);

  const activeIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.id === currentStep),
  );
  const activeStepData = STEPS[activeIndex];
  const prevStep: Step | undefined = STEPS[activeIndex - 1];
  const nextStep: Step | undefined = STEPS[activeIndex + 1];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* ── Header tipis dengan breadcrumb ── */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label="Kembali ke dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <BookOpen className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium truncate">Tentoring SE2026</span>
              <span className="text-border">/</span>
              <span className="text-muted-foreground">Dokumentasi</span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <MapPin className="w-3.5 h-3.5" /> Buka dashboard peta
          </Button>
        </div>
      </header>

      <div className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-[232px_1fr] gap-x-12">
        {/* ── Sidebar navigasi: daftar langkah ── */}
        <aside className="lg:sticky lg:top-12 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto py-4 lg:py-8 lg:border-r lg:pr-6 border-b lg:border-b-0">
          <p className="hidden lg:block text-xs font-medium text-muted-foreground mb-3 px-2">
            Panduan pengguna
          </p>
          <nav
            aria-label="Daftar langkah"
            className="flex lg:flex-col gap-1 overflow-x-auto -mx-1 px-1 lg:mx-0 lg:px-0"
          >
            {STEPS.map((step) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  aria-current={isActive ? "step" : undefined}
                  className={`shrink-0 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {/* Nomor mono, berubah jadi centang kalau sudah dilewati */}
                  <span
                    className={`${NUM} flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] ${
                      isActive
                        ? "border-primary/40 bg-primary text-primary-foreground"
                        : isCompleted
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-background"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : step.id}
                  </span>
                  <span className="whitespace-nowrap lg:whitespace-normal">
                    {step.shortTitle}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Konten ── */}
        <main className="min-w-0 py-8 lg:py-10 max-w-3xl">
          {/* Judul langkah + progress segmen */}
          <div className="space-y-3 pb-6 border-b">
            <div className="flex items-center gap-3">
              <span
                className={`${NUM} rounded-md border bg-primary/5 text-primary px-2 py-0.5 text-[11px] font-medium`}
              >
                Langkah {currentStep} / {STEPS.length}
              </span>
              {/* Empat segmen tipis: terisi sampai langkah aktif */}
              <div className="flex items-center gap-1" aria-hidden="true">
                {STEPS.map((s) => (
                  <span
                    key={s.id}
                    className={`h-1 w-8 rounded-full transition-colors duration-300 ${
                      s.id <= currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {activeStepData.title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {activeStepData.description}. Panduan memakai Sistem Pemetaan
              Spasial Sensus Ekonomi 2026, BPS Kabupaten Banyuwangi.
            </p>
          </div>

          {/* Isi tiap langkah */}
          <div className="py-6 space-y-5 animate-fade-in">
            {/* Step 1 */}
            {currentStep === 1 && (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Portal Spasial Tentoring SE2026 mengelompokkan data ke dalam
                  beberapa layer entitas yang bisa langsung ditinjau di peta.
                </p>
                <InfoList items={LAYERS} />
                <Callout icon={Building2} title="Bangunan fisik & polygon SLS">
                  Hover atau klik polygon SLS / bangunan di peta untuk melihat
                  popup alamat lengkap: dusun, RT/RW, SLS, desa, dan kecamatan.
                </Callout>
              </>
            )}

            {/* Step 2: urutan nyata → timeline bernomor */}
            {currentStep === 2 && (
              <>
                <ol>
                  {FILTER_STEPS.map((item, i) => (
                    <li key={item.title} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          className={`${NUM} h-6 w-6 rounded-md border bg-primary/5 text-primary text-[11px] font-medium flex items-center justify-center`}
                        >
                          {i + 1}
                        </span>
                        {i < FILTER_STEPS.length - 1 && (
                          <span className="w-px flex-1 bg-border my-1" />
                        )}
                      </div>
                      <div className="pb-6">
                        <h4 className="text-sm font-medium text-foreground">
                          {item.title}
                        </h4>
                        <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <Callout icon={Zap} title="Catatan performa">
                  Supaya peta tetap lancar, sebaran titik individu hanya
                  ditampilkan setelah kamu memilih Kecamatan spesifik.
                </Callout>
              </>
            )}

            {/* Step 3 */}
            {currentStep === 3 && (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Panel statistik melayang di bagian bawah peta dan otomatis
                  ter-update mengikuti filter wilayah yang dipilih.
                </p>
                <InfoList items={STATS} />
              </>
            )}

            {/* Step 4 */}
            {currentStep === 4 && (
              <>
                <Callout
                  icon={Layers}
                  title="Versi dataset: Baseline Prelist vs SE2026"
                >
                  Beralih antara <strong>Baseline Prelist</strong> (data awal)
                  dan <strong>SE2026 Baru</strong> (hasil pencacahan). Aktifkan{" "}
                  <strong>Mode Komparasi</strong> di sidebar untuk melihat dua
                  peta berdampingan (dual map comparison).
                </Callout>

                <div className="space-y-2.5">
                  <h4 className="text-sm font-medium text-foreground">
                    Matriks hak akses pengguna (RBAC)
                  </h4>
                  <div className="overflow-x-auto rounded-lg border bg-background">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Role</th>
                          <th className="px-4 py-2.5 font-medium">
                            Cakupan wilayah
                          </th>
                          <th className="px-4 py-2.5 font-medium">
                            Mode komparasi
                          </th>
                          <th className="px-4 py-2.5 font-medium">
                            Export Excel / CSV
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {ROLES.map((row) => (
                          <tr
                            key={row.role}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-2 font-medium text-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                {row.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {row.scope}
                            </td>
                            <td className="px-4 py-3">
                              <Access allowed={row.comparison} />
                            </td>
                            <td className="px-4 py-3">
                              <Access allowed={row.exportData} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Navigasi prev / next: dua kartu ala docs ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t">
            {prevStep ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prevStep.id)}
                className="group rounded-lg border p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                </span>
                <span className="block mt-1 text-sm font-medium group-hover:text-primary transition-colors">
                  {prevStep.shortTitle}
                </span>
              </button>
            ) : (
              <span className="hidden sm:block" />
            )}

            {nextStep ? (
              <button
                type="button"
                onClick={() => setCurrentStep(nextStep.id)}
                className="group rounded-lg border p-4 text-right transition-colors hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                  Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
                </span>
                <span className="block mt-1 text-sm font-medium group-hover:text-primary transition-colors">
                  {nextStep.shortTitle}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="group rounded-lg border border-primary/40 bg-primary/5 p-4 text-right transition-colors hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="flex items-center justify-end gap-1 text-[11px] text-primary">
                  Selesai <MapPin className="w-3.5 h-3.5" />
                </span>
                <span className="block mt-1 text-sm font-medium text-primary">
                  Buka dashboard peta
                </span>
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}