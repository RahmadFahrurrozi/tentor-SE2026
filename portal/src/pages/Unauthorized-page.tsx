import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        {/* Icon - Clean & Minimal */}
        <div className="flex justify-center mb-4">
          <ShieldAlert className="size-10 text-stone-400" strokeWidth={1.5} />
        </div>

        {/* Content - Direct & Clear */}
        <h1 className="text-2xl font-light text-stone-900 mb-2 tracking-tight">
          403 Akses Ditolak
        </h1>

        <p className="text-stone-400 text-sm leading-relaxed mb-4">
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>

        {/* Action - One clear path */}
        <Button
          asChild
          variant="outline"
          className="border-stone-200 hover:bg-stone-50 text-stone-700 rounded-none px-6 h-10 text-sm font-normal"
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

export default UnauthorizedPage;
