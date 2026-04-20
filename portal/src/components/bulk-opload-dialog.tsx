/**
 * BulkUploadDialog.tsx
 *
 * Support upload massal via:
 * - CSV  (.csv)
 * - Excel (.xlsx / .xls)
 *
 * Parsing Excel pakai SheetJS (xlsx) — sudah bundled di kebanyakan Next.js project.
 * Kalau belum ada: npm install xlsx
 *
 * Format kolom yang diterima (header case-insensitive):
 *   full_name / nama  |  email  |  role (ppl / pml / admin)
 */

"use client";

import { useRef, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type {
  CreateUserPayload,
  BulkUploadResult,
} from "../services/user.service";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_ROLES = ["ppl", "pml", "admin"] as const;
const MAX_USERS = 200;
const ACCEPTED_EXTENSIONS = ".csv,.xlsx,.xls";

// ---------------------------------------------------------------------------
// Normalizer — map berbagai nama header ke field yang kita butuhkan
// ---------------------------------------------------------------------------

const HEADER_MAP: Record<string, keyof CreateUserPayload> = {
  full_name: "full_name",
  nama: "full_name",
  name: "full_name",
  "nama lengkap": "full_name",
  email: "email",
  "alamat email": "email",
  role: "role",
  "hak akses": "role",
  jabatan: "role",
};

function normalizeHeader(raw: string): keyof CreateUserPayload | null {
  return HEADER_MAP[raw.toLowerCase().trim()] ?? null;
}

// ---------------------------------------------------------------------------
// Parse result types
// ---------------------------------------------------------------------------

interface ParseResult {
  valid: CreateUserPayload[];
  errors: Array<{ row: number; reason: string; raw: string }>;
  fileName: string;
  fileType: "csv" | "excel";
}

// ---------------------------------------------------------------------------
// Core parser — works on array of plain objects (row data)
// SheetJS dan CSV keduanya dikonversi ke format ini dulu sebelum divalidasi
// ---------------------------------------------------------------------------

function validateRows(
  rows: Record<string, unknown>[],
  fileType: "csv" | "excel",
  fileName: string,
): ParseResult {
  const valid: CreateUserPayload[] = [];
  const errors: ParseResult["errors"] = [];

  rows.forEach((rawRow, idx) => {
    const rowNum = idx + 2; // +2 karena row 1 = header

    // Normalize keys
    const row: Partial<Record<keyof CreateUserPayload, string>> = {};
    for (const [key, val] of Object.entries(rawRow)) {
      const mapped = normalizeHeader(key);
      if (mapped) row[mapped] = String(val ?? "").trim();
    }

    const { full_name, email, role } = row;

    if (!full_name || full_name.length < 2) {
      errors.push({
        row: rowNum,
        reason: "Nama tidak valid atau kosong",
        raw: JSON.stringify(rawRow),
      });
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({
        row: rowNum,
        reason: `Email tidak valid: "${email}"`,
        raw: JSON.stringify(rawRow),
      });
      return;
    }

    const normalizedRole = role?.toLowerCase().trim();
    if (!normalizedRole || !VALID_ROLES.includes(normalizedRole as never)) {
      errors.push({
        row: rowNum,
        reason: `Role tidak valid: "${role}". Gunakan: ppl / pml / admin`,
        raw: JSON.stringify(rawRow),
      });
      return;
    }

    valid.push({
      full_name,
      email,
      role: normalizedRole as CreateUserPayload["role"],
    });
  });

  return { valid, errors, fileName, fileType };
}

// ---------------------------------------------------------------------------
// File parsers
// ---------------------------------------------------------------------------

function parseCSVText(text: string, fileName: string): ParseResult {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { valid: [], errors: [], fileName, fileType: "csv" };
  }

  const headers = lines[0]
    .split(",")
    .map((h) => h.replace(/^"|"$/g, "").trim());
  const rows: Record<string, unknown>[] = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i] ?? "";
    });
    return obj;
  });

  return validateRows(rows, "csv", fileName);
}

function parseExcelBuffer(buffer: ArrayBuffer, fileName: string): ParseResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]]; // ambil sheet pertama
  // header: 1 → baris pertama jadi key object
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false, // semua nilai jadi string, hindari number/date confusion
  });

  return validateRows(rows, "excel", fileName);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({
  processed,
  total,
}: {
  processed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-zinc-500">
        <span>Mengupload pengguna...</span>
        <span>
          {processed} / {total}
        </span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-zinc-900 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-zinc-400 text-right">{pct}%</p>
    </div>
  );
}

function ResultSummary({ result }: { result: BulkUploadResult }) {
  const { succeeded, failed } = result;
  const allOk = failed.length === 0;

  return (
    <div className="space-y-4">
      <div
        className={`flex items-start gap-3 p-4 rounded-lg border ${
          allOk
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        {allOk ? (
          <CheckCircle2 className="size-5 text-green-600 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertTriangle className="size-5 text-amber-600 mt-0.5 flex-shrink-0" />
        )}
        <div>
          <p className="text-sm font-medium text-zinc-800">
            {allOk
              ? `${succeeded.length} pengguna berhasil diimport`
              : `${succeeded.length} berhasil, ${failed.length} gagal`}
          </p>
          {!allOk && (
            <p className="text-xs text-zinc-500 mt-1">
              Email yang sudah terdaftar dilewati secara otomatis.
            </p>
          )}
        </div>
      </div>

      {failed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-600">Detail gagal:</p>
          <div className="max-h-40 overflow-y-auto rounded border divide-y text-xs">
            {failed.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2">
                <XCircle className="size-3.5 text-rose-500 flex-shrink-0" />
                <span className="font-medium text-zinc-700">
                  {f.user.email}
                </span>
                <span className="text-zinc-400 truncate">{f.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template download helpers
// ---------------------------------------------------------------------------

function downloadCSVTemplate() {
  const csv = [
    "full_name,email,role",
    "Budi Santoso,budi@bps.go.id,ppl",
    "Siti Rahmawati,siti@bps.go.id,pml",
    "Admin BPS,admin@bps.go.id,admin",
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template_import_pengguna.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadExcelTemplate() {
  const data = [
    { full_name: "Budi Santoso", email: "budi@bps.go.id", role: "ppl" },
    { full_name: "Siti Rahmawati", email: "siti@bps.go.id", role: "pml" },
    { full_name: "Admin BPS", email: "admin@bps.go.id", role: "admin" },
  ];

  const ws = XLSX.utils.json_to_sheet(data);

  // Style header row (bold) — SheetJS community edition support terbatas,
  // tapi kita bisa set column widths
  ws["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pengguna");
  XLSX.writeFile(wb, "template_import_pengguna.xlsx");
}

// ---------------------------------------------------------------------------
// Main Dialog Component
// ---------------------------------------------------------------------------

interface BulkUploadDialogProps {
  onUpload: (users: CreateUserPayload[]) => Promise<BulkUploadResult>;
  isRunning: boolean;
  progress: { processed: number; total: number };
}

export function BulkUploadDialog({
  onUpload,
  isRunning,
  progress,
}: BulkUploadDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const isCSV = file.name.endsWith(".csv");

    if (!isExcel && !isCSV) {
      alert("Hanya file .csv, .xlsx, atau .xls yang diterima.");
      return;
    }

    const reader = new FileReader();

    if (isCSV) {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setParseResult(parseCSVText(text, file.name));
        setUploadResult(null);
      };
      reader.readAsText(file, "UTF-8");
    } else {
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        setParseResult(parseExcelBuffer(buffer, file.name));
        setUploadResult(null);
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleUpload = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;
    try {
      const result = await onUpload(parseResult.valid);
      setUploadResult(result);
    } catch {
      // error sudah di-handle di hook (toast)
    }
  };

  const reset = () => {
    setParseResult(null);
    setUploadResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const isOverCap = (parseResult?.valid.length ?? 0) > MAX_USERS;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 px-4 shadow-sm">
          <Upload className="mr-2 size-4" />
          Import File
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader className="p-6 pb-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 text-blue-600 rounded-full">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                Import Pengguna Massal
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Upload CSV atau Excel. Maks. {MAX_USERS} pengguna per upload.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Template downloads */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500">Download template:</span>
            <button
              onClick={downloadCSVTemplate}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline"
            >
              <FileText className="size-3.5" />
              CSV
            </button>
            <button
              onClick={downloadExcelTemplate}
              className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 hover:underline"
            >
              <FileSpreadsheet className="size-3.5" />
              Excel (.xlsx)
            </button>
          </div>

          {/* Drop zone */}
          {!uploadResult && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`
                relative flex flex-col items-center justify-center gap-2
                h-32 border-2 border-dashed rounded-xl cursor-pointer
                transition-colors duration-200
                ${isDragging ? "border-blue-400 bg-blue-50" : ""}
                ${parseResult && !isDragging ? "border-zinc-300 bg-zinc-50" : ""}
                ${!parseResult && !isDragging ? "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50" : ""}
              `}
            >
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileInput}
                className="hidden"
              />
              <Upload className="size-6 text-zinc-400" />
              {parseResult ? (
                <>
                  <p className="text-sm text-zinc-600 font-medium">
                    ✓ {parseResult.fileName}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {parseResult.fileType === "excel" ? "Excel" : "CSV"} ·{" "}
                    {parseResult.valid.length + parseResult.errors.length} baris
                    data
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-zinc-500">
                    Drag & drop atau klik untuk pilih file
                  </p>
                  <p className="text-xs text-zinc-400">
                    Mendukung .csv · .xlsx · .xls
                  </p>
                </>
              )}
            </div>
          )}

          {/* Parse result */}
          {parseResult && !uploadResult && !isRunning && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-700">
                    {parseResult.valid.length}
                  </p>
                  <p className="text-xs text-green-600">Siap diimport</p>
                </div>
                <div className="flex-1 p-3 bg-rose-50 border border-rose-200 rounded-lg text-center">
                  <p className="text-xl font-bold text-rose-700">
                    {parseResult.errors.length}
                  </p>
                  <p className="text-xs text-rose-600">Baris error</p>
                </div>
              </div>

              {isOverCap && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="size-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Jumlah data valid ({parseResult.valid.length}) melebihi
                    batas {MAX_USERS} pengguna. Pecah menjadi beberapa file.
                  </p>
                </div>
              )}

              {parseResult.errors.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-zinc-600">
                    Error pada baris:
                  </p>
                  <div className="max-h-28 overflow-y-auto rounded border divide-y text-xs">
                    {parseResult.errors.map((e, i) => (
                      <div key={i} className="flex gap-2 px-3 py-1.5">
                        <span className="text-zinc-400 flex-shrink-0">
                          Baris {e.row}
                        </span>
                        <span className="text-rose-600 truncate">
                          {e.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {isRunning && (
            <ProgressBar
              processed={progress.processed}
              total={progress.total}
            />
          )}

          {/* Result */}
          {uploadResult && <ResultSummary result={uploadResult} />}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            {uploadResult ? (
              <Button
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
              >
                Selesai
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={reset}
                  disabled={isRunning || !parseResult}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={
                    !parseResult ||
                    parseResult.valid.length === 0 ||
                    isOverCap ||
                    isRunning
                  }
                >
                  {isRunning
                    ? "Mengupload..."
                    : `Import ${parseResult?.valid.length ?? 0} Pengguna`}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
