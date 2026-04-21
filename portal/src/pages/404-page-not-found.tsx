import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <FileQuestion className="size-10 text-stone-400" strokeWidth={1.5} />
        </div>

        {/* Content */}
        <h1 className="text-2xl font-light text-stone-900 mb-2 tracking-tight">
          404 Halaman Tidak Ditemukan
        </h1>

        <p className="text-stone-400 text-sm leading-relaxed mb-4">
          Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>

        {/* Action */}
        <Button
          asChild
          variant="outline"
          className="border-stone-200 hover:bg-stone-50 text-stone-700 rounded-md px-6 h-10 text-sm font-normal"
        >
          <Link to="/login">
            <ArrowLeft className="mr-2 size-3.5" strokeWidth={1.5} />
            Kembali ke Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default NotFoundPage;
