import { FileArchive } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsOfServicePage() {
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
            Terms of Service
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
            Terms of Service
          </h1>
          <p className="text-zinc-500 text-lg leading-relaxed">
            Sistem Monitoring Bangunan Usaha Kabupaten Banyuwangi (SE2026).
            Segala ketentuan di bawah ini mengikat secara profesional bagi
            seluruh pemangku kepentingan BPS.
          </p>
        </div>

        <div className="space-y-16">
          {/* Section 1: Terms of Service */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-8 rounded-md bg-primary text-white flex items-center justify-center font-bold text-sm">
                <FileArchive />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Terms of Service
              </h2>
            </div>

            <div className="space-y-8 text-zinc-600 leading-relaxed">
              <article>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                  1. Peruntukan Sistem & Akses
                </h3>
                <p>
                  Sistem ini bersifat <strong>Tertutup (Internal)</strong> dan
                  dibuat eksklusif hanya untuk kepentingan pendataan statistik
                  geografis di bawah naungan BPS Kabupaten Banyuwangi. Anda
                  dilarang keras untuk:
                </p>
                <ul className="list-disc pl-5 mt-3 space-y-2">
                  <li>
                    Memberikan, menyewakan, atau menyebarluaskan akses
                    kredensial (Email, Password, atau tautan sesi) Anda kepada
                    pihak luar atau publik.
                  </li>
                  <li>
                    Bekerja menggunakan akun petugas lain yang region/wilayah
                    kerjanya berbeda.
                  </li>
                  <li>
                    Meretas, mem-bypass filter pembagian wilayah, atau
                    memanipulasi sesi autentikasi demi mengambil data di luar
                    hak wilayah Anda.
                  </li>
                </ul>
              </article>

              <article>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                  2. Tanggung Jawab Data (Ground Truth)
                </h3>
                <p>
                  User yang ditugaskan (PPL / PML) berkewajiban untuk mensurvei
                  dan melaporkan data spesifik (Titik Usaha, Bangunan, Rumah
                  Tangga) beserta keakuratannya yang sesuai dengan aktual
                  lapangan (<em>Ground Truth</em>). Segala
                  ketidaksesuaian/kesalahan input yang disengaja atas entitas
                  spasial dapat merugikan ketepatan data instansi di SE2026.
                </p>
              </article>

              <article>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                  3. Penghentian Akses
                </h3>
                <p>
                  Pihak Administrator TENTORING_SE2026 berhak penuh untuk
                  mencabut akses, memberlakukan <em>logout paksa</em>, atau
                  menonaktifkan akun Anda sewaktu-waktu tanpa pemberitahuan jika
                  terindikasi mendistribusikan data tanpa izin atau peretasan
                  kredensial.
                </p>
              </article>
            </div>
          </section>

          <hr className="border-t-2 border-zinc-100" />
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
