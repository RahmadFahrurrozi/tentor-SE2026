import { File } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicyPage() {
  const currentYear = new Date().getFullYear();
  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans selection:bg-primary selection:text-white">
      {/* Minimalist Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-zinc-200 px-6 sm:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/10"
            aria-label="Kembali"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-600"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </Link>
          <span className="font-semibold text-lg tracking-tight">
            Privacy Policy
          </span>
        </div>
        <div className="text-sm flex items-center gap-2 font-medium text-zinc-500 tracking-widest">
          <img src="/logo.svg" alt="Logo-BPS" className="h-8" />
          <span className="hidden sm:block">
            Badan Pusat Statistik Kabupaten Banyuwangi
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto w-full px-6 py-16 sm:py-24">
        {/* Title Section */}
        <div className="mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6 text-zinc-900">
            Privacy Policy
          </h1>
          <hr className="border-t-2 border-zinc-200" />
        </div>

        <div className="space-y-16">
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-8 rounded-md bg-primary text-white flex items-center justify-center font-bold text-sm">
                <File />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Privacy Policy
              </h2>
            </div>

            <div className="space-y-8 text-zinc-600 leading-relaxed">
              <article>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                  1. Pengumpulan Data Informasi
                </h3>
                <p>
                  Sistem mengumpulkan data yang diperlukan untuk mendukung
                  pelaksanaan Sensus Ekonomi 2026, meliputi informasi identitas
                  dan kewenangan Petugas, serta data geospasial wilayah
                  penugasan yang bersifat internal dan rahasia institusi.
                </p>
              </article>

              <article>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                  2. Penggunaan Data
                </h3>
                <p>
                  Semua data yang dikumpulkan digunakan semata-mata untuk
                  keperluan visualisasi dan monitoring Sensus Ekonomi 2026. Data
                  identitas Petugas digunakan untuk memastikan setiap pengguna
                  hanya dapat mengakses wilayah penugasan yang sesuai dengan
                  wewenangnya.
                </p>
              </article>

              <article>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                  3. Keamanan Data (Security)
                </h3>
                <p>
                  Sistem menerapkan standar keamanan tingkat industri untuk
                  memastikan seluruh data terlindungi. Setiap akses ke sistem
                  diautentikasi secara ketat, dan seluruh perpindahan data
                  dilindungi oleh mekanisme enkripsi dan validasi sesi yang
                  aman.
                </p>
              </article>

              <article className="bg-[#f0f0f0] p-6 rounded-xl border border-zinc-200 mt-6">
                <h3 className="text-lg font-bold text-red-600 mb-2">
                  4. Zero External Sharing
                </h3>
                <p className="text-zinc-800">
                  Keseluruhan dataset instrumen dan relasi koordinat sistem
                  adalah rahasia institusi BPS Banyuwangi. Kami tidak
                  memperdagangkan, menjual, atau mendistribusikan metadata
                  internal wilayah kepada entitas luar. Publikasi data hanya
                  dilakukan apabila memenuhi standar rilis makro Sensus yang
                  berlaku.
                </p>
              </article>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-zinc-200 text-center sm:text-left sm:flex sm:justify-between items-center text-sm text-zinc-400">
          <p>Badan Pusat Statistik Kabupaten Banyuwangi © {currentYear}.</p>
          <div className="mt-4 sm:mt-0 space-x-4">
            <span className="cursor-pointer hover:text-zinc-900 transition-colors">
              Internal Only
            </span>
            <span className="cursor-pointer hover:text-zinc-900 transition-colors">
              SE2026
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
