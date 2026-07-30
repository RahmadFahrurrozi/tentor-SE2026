import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const STEPS = [
  {
    id: 1,
    title: "Pengenalan Layer Spasial",
    shortTitle: "1. Layer Spasial",
    description:
      "Penjelasan entitas titik lokasi usaha, rumah tangga, bangunan, & SLS",
    icon: Layers,
  },
  {
    id: 2,
    title: "Navigasi & Filter Wilayah",
    shortTitle: "2. Filter Wilayah",
    description: "Cara memfilter Kecamatan, Desa/Kelurahan, dan pencarian nama",
    icon: MapPin,
  },
  {
    id: 3,
    title: "Statistik & Insight Monitoring",
    shortTitle: "3. Panel Statistik",
    description:
      "Analisis metrik KPI, visual chart, tabel data, & export Excel",
    icon: BarChart3,
  },
  {
    id: 4,
    title: "Mode Komparasi & Hak Akses Role",
    shortTitle: "4. Role & Komparasi",
    description:
      "Perbandingan dataset SE2026 vs Prelist & wewenang Admin/PML/PPL",
    icon: ShieldCheck,
  },
];

export default function DocumentationPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const activeStepData = STEPS.find((s) => s.id === currentStep) || STEPS[0];
  const progressPercentage = Math.round((currentStep / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col selection:bg-primary selection:text-primary-foreground">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur-md px-4 md:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="h-9 w-9 rounded-lg border-border hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight">
                  Dokumentasi Tentoring SE2026
                </h1>
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/30 text-[10px] font-semibold px-2 py-0"
                >
                  Panduan Pengguna
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Sistem Pemetaan Spasial Sensus Ekonomi 2026 - BPS Kabupaten
                Banyuwangi
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => navigate("/dashboard")}
          className="text-xs font-semibold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm rounded-lg px-3.5 h-9"
        >
          <MapPin className="w-3.5 h-3.5" /> Buka Dashboard Peta
        </Button>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
        {/* Step Progress Tracker Section (Dot Progress Stepper) */}
        <section className="bg-card border rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Panduan Langkah Demi Langkah
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight mt-0.5">
                {activeStepData.title}
              </h2>
            </div>
            <Badge
              variant="outline"
              className="w-fit text-xs font-medium bg-muted/50 px-3 py-1 border-primary/20 text-primary"
            >
              Langkah {currentStep} dari {STEPS.length} ({progressPercentage}%
              Selesai)
            </Badge>
          </div>

          {/* Stepper Dot Progress Component */}
          <div className="relative pt-2 pb-1">
            {/* Connecting Bar Background */}
            <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-muted rounded-full z-0" />
            {/* Connecting Bar Active Fill */}
            <div
              className="absolute top-1/2 left-4 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-500 ease-in-out"
              style={{
                width: `${((currentStep - 1) / (STEPS.length - 1)) * 95}%`,
              }}
            />

            {/* Step Dots Grid */}
            <div className="relative z-10 flex items-center justify-between">
              {STEPS.map((step) => {
                const isCompleted = step.id < currentStep;
                const isActive = step.id === currentStep;

                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className="flex flex-col items-center gap-2 group focus:outline-none"
                  >
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                        isActive
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110 shadow-md"
                          : isCompleted
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-muted-foreground border-2 border-border hover:border-primary/50"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span>{step.id}</span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-medium hidden md:inline transition-colors max-w-27.5 text-center truncate ${
                        isActive
                          ? "text-primary font-bold"
                          : isCompleted
                            ? "text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {step.shortTitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Step Content Panels */}
        <section className="space-y-6">
          {/* STEP 1: Layer Spasial & Entitas */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <Card className="border-border bg-card">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">
                        1. Penjelasan Layer & Entitas Spasial
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Jenis entitas terdata di lapangan dalam proyek SE2026
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <p>
                    Portal Spasial Tentoring SE2026 mengelompokkan data ke dalam
                    5 layer entitas spasial utama yang dapat ditinjau secara
                    langsung di peta:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 bg-muted/40 rounded-xl border flex items-start gap-3">
                      <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
                        <Store className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-xs">
                          Titik Usaha Biasa
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Usaha fisik sektor non-pertanian (toko, warung,
                          pabrik, bengkel, ruko, restoran).
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-muted/40 rounded-xl border flex items-start gap-3">
                      <div className="p-2 bg-pink-500/10 text-pink-500 rounded-lg shrink-0">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-xs">
                          Titik Usaha Digital
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Usaha berbasis e-commerce, toko online, marketplace,
                          atau layanan digital.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-muted/40 rounded-xl border flex items-start gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg shrink-0">
                        <Sprout className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-xs">
                          Titik Usaha Pertanian
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Objek usaha agrikultur, lahan tani, perikanan,
                          peternakan, dan kehutanan.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-muted/40 rounded-xl border flex items-start gap-3">
                      <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg shrink-0">
                        <Home className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-xs">
                          Titik Rumah Tangga
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Unit kediaman keluarga (KK) terdaftar hasil pencacahan
                          SLS.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 space-y-1">
                    <h4 className="font-bold text-primary text-xs flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" /> Bangunan Fisik & Polygon
                      SLS
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Hover atau klik pada polygon SLS / bangunan fisik di peta
                      untuk melihat popup rincian alamat lengkap (Dusun, RT/RW,
                      SLS, Desa, Kecamatan).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 2: Navigasi & Filter Wilayah */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <Card className="border-border bg-card">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">
                        2. Prosedur Filter Wilayah & Pencarian
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Petunjuk memfilter wilayah Kecamatan, Desa, dan mencari
                        nama usaha
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>
                      <strong className="text-foreground">
                        Pilih Kecamatan
                      </strong>
                      : Pilih nama Kecamatan pada dropdown filter di Sidebar
                      Kiri atau di Header Panel Statistik.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        Pilih Desa/Kelurahan
                      </strong>
                      : Setelah Kecamatan dipilih, dropdown Desa/Kelurahan akan
                      aktif untuk memfilter spesifik satu Desa.
                    </li>
                    <li>
                      <strong className="text-foreground">
                        Pencarian Nama Usaha / KRT
                      </strong>
                      : Ketik nama usaha (contoh: <code>BAKSO</code>,{" "}
                      <code>WARUNG</code>, atau nama KRT) di kolom pencarian
                      untuk menyaring titik di peta secara instan.
                    </li>
                    <li>
                      <strong className="text-foreground">Reset Filter</strong>:
                      Klik tombol <em>Reset Filter</em> di sidebar untuk
                      mengembalikan filter ke posisi semula.
                    </li>
                  </ol>

                  <div className="p-3.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20 flex items-start gap-2.5">
                    <Zap className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="text-xs">
                      <strong>Catatan Performa Spasial</strong>: Untuk menjaga
                      performa peta tetap lancar, sebaran titik lokasi individu
                      ditampilkan saat Anda memilih Kecamatan spesifik.
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 3: Panel Statistik & Insight Monitoring */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <Card className="border-border bg-card">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">
                        3. Panel Statistik & Insight Monitoring
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Visualisasi indikator spasial, visual chart, & export
                        data spreadsheet
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <p>
                    Panel statistik melayang di bagian bawah peta menyajikan
                    berbagai metrik agregat yang langsung ter-update sesuai
                    filter wilayah terpilih:
                  </p>

                  <div className="space-y-3">
                    <div className="p-3 bg-muted/40 rounded-xl border space-y-1">
                      <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />{" "}
                        Status Kunjungan (% Progress)
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Pie Chart & Ring Donut chart memperlihatkan proporsi
                        bangunan yang sudah dikunjungi vs belum dikunjungi di
                        lapangan.
                      </p>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-xl border space-y-1">
                      <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-amber-500" /> Sebaran
                        Entitas Terdata
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Bar Chart membandingkan jumlah Usaha Biasa, Digital,
                        Pertanian, dan Unit Rumah Tangga di wilayah tersebut.
                      </p>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-xl border space-y-1">
                      <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />{" "}
                        Export Excel & CSV
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Role Admin dan PML dapat mengunduh laporan rekapitulasi
                        data spasial ke format file <code>.xlsx</code> atau{" "}
                        <code>.csv</code>.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 4: Mode Komparasi & Hak Akses Role */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in">
              <Card className="border-border bg-card">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">
                        4. Mode Komparasi & Matriks Hak Akses Role
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Pengaturan versi dataset spasial dan wewenang pengguna
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <div>
                    <h4 className="font-bold text-foreground text-xs mb-2">
                      Pengaturan Versi Dataset (Baseline Prelist vs SE2026)
                    </h4>
                    <p className="text-xs leading-relaxed">
                      Anda dapat beralih antara dataset{" "}
                      <strong>Baseline Prelist</strong> (data awal) dan{" "}
                      <strong>SE2026 Baru</strong> (hasil pencacahan), serta
                      mengaktifkan <strong>Mode Komparasi</strong> di sidebar
                      untuk melihat 2 peta bersampingan (*Dual Map Comparison*).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-foreground text-xs">
                      Matriks Hak Akses Pengguna (RBAC)
                    </h4>
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted text-muted-foreground font-bold border-b">
                          <tr>
                            <th className="p-3">Role</th>
                            <th className="p-3">Cakupan Wilayah Filter</th>
                            <th className="p-3">Mode Komparasi</th>
                            <th className="p-3">Export Excel / CSV</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-foreground">
                          <tr>
                            <td className="p-3 font-bold text-rose-500">
                              Admin
                            </td>
                            <td className="p-3">
                              Seluruh Kabupaten Banyuwangi
                            </td>
                            <td className="p-3 text-emerald-500 font-semibold">
                              ✅ Akses Penuh
                            </td>
                            <td className="p-3 text-emerald-500 font-semibold">
                              ✅ Akses Penuh
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold text-blue-500">
                              PML (Pengawas)
                            </td>
                            <td className="p-3">Kecamatan & Desa Penugasan</td>
                            <td className="p-3 text-emerald-500 font-semibold">
                              ✅ Akses Penuh
                            </td>
                            <td className="p-3 text-emerald-500 font-semibold">
                              ✅ Akses Wilayah Tugas
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 font-bold text-emerald-500">
                              PPL (Petugas)
                            </td>
                            <td className="p-3">Desa Penugasan Spesifik</td>
                            <td className="p-3 text-emerald-500 font-semibold">
                              ✅ Akses Penuh
                            </td>
                            <td className="p-3 text-muted-foreground">
                              ❌ Khusus Admin/PML
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* Step Navigation Controls (Prev & Next Buttons) */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="text-xs font-semibold gap-1.5 h-9"
          >
            <ChevronLeft className="w-4 h-4" /> Langkah Sebelumnya
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={() =>
                setCurrentStep((prev) => Math.min(STEPS.length, prev + 1))
              }
              className="text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground h-9"
            >
              Langkah Selanjutnya <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/dashboard")}
              className="text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-9"
            >
              Selesai & Buka Peta <MapPin className="w-4 h-4" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
