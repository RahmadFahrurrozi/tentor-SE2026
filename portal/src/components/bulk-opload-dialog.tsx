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
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  CreateUserPayload,
  BulkUploadResult,
} from "@/services/user.service";

const VALID_ROLES = ["ppl", "pml", "admin"] as const;
const MAX_USERS = 200;
const ACCEPTED_EXTENSIONS = ".csv,.xlsx,.xls";

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
  assignments: "assignments",
  penugasan: "assignments",
  wilayah: "assignments",
};

function normalizeHeader(raw: string): keyof CreateUserPayload | null {
  return HEADER_MAP[raw.toLowerCase().trim()] ?? null;
}

interface ParseResult {
  valid: CreateUserPayload[];
  errors: Array<{ row: number; reason: string }>;
  fileName: string;
}

function validateRows(
  rows: Record<string, unknown>[],
  fileName: string,
): ParseResult {
  const valid: CreateUserPayload[] = [];
  const errors: ParseResult["errors"] = [];

  rows.forEach((rawRow, idx) => {
    const rowNum = idx + 2;
    const row: Partial<Record<keyof CreateUserPayload, string>> = {};

    for (const [key, val] of Object.entries(rawRow)) {
      const mapped = normalizeHeader(key);
      if (mapped) row[mapped] = String(val ?? "").trim();
    }

    const { full_name, email, role, assignments } = row;

    if (!full_name || full_name.length < 2) {
      errors.push({ row: rowNum, reason: "Nama tidak valid atau kosong" });
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNum, reason: `Email tidak valid: "${email}"` });
      return;
    }

    const normalizedRole = role?.toLowerCase().trim();
    if (!normalizedRole || !VALID_ROLES.includes(normalizedRole as never)) {
      errors.push({
        row: rowNum,
        reason: `Role tidak valid: "${role}". Gunakan: ppl / pml / admin`,
      });
      return;
    }

    valid.push({
      full_name,
      email,
      role: normalizedRole as CreateUserPayload["role"],
      assignments: assignments
        ? assignments
            .split(";")
            .map((a) => a.trim())
            .filter(Boolean)
        : [],
    });
  });

  return { valid, errors, fileName };
}

function parseCSVText(text: string, fileName: string): ParseResult {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { valid: [], errors: [], fileName };

  const headers = lines[0]
    .split(",")
    .map((h) => h.replace(/^"|"$/g, "").trim());
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i] ?? "";
    });
    return obj;
  });

  return validateRows(rows, fileName);
}

function parseExcelBuffer(buffer: ArrayBuffer, fileName: string): ParseResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false,
  });
  return validateRows(rows, fileName);
}

function downloadCSVTemplate() {
  const csv = [
    "full_name,email,role,assignments",
    "Budi Santoso,budi@bps.go.id,ppl,3510010001;3510010002",
    "Siti Rahmawati,siti@bps.go.id,pml,3510010",
    "Admin BPS,admin@bps.go.id,admin,",
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
    {
      full_name: "Budi Santoso",
      email: "budi@bps.go.id",
      role: "ppl",
      assignments: "3510010001;3510010002",
    },
    {
      full_name: "Siti Rahmawati",
      email: "siti@bps.go.id",
      role: "pml",
      assignments: "3510010",
    },
    {
      full_name: "Admin BPS",
      email: "admin@bps.go.id",
      role: "admin",
      assignments: "",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pengguna");
  XLSX.writeFile(wb, "template_import_pengguna.xlsx");
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (users: CreateUserPayload[]) => Promise<BulkUploadResult>;
  isUploading: boolean;
  progress: { processed: number; total: number };
}

export function BulkUploadModal({
  isOpen,
  onClose,
  onUpload,
  isUploading,
  progress,
}: BulkUploadModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(
    null,
  );
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
      reader.onload = (e) =>
        setParseResult(parseCSVText(e.target?.result as string, file.name));
      reader.readAsText(file, "UTF-8");
    } else {
      reader.onload = (e) =>
        setParseResult(
          parseExcelBuffer(e.target?.result as ArrayBuffer, file.name),
        );
      reader.readAsArrayBuffer(file);
    }
    setUploadResult(null);
  }, []);

  const handleUpload = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;
    const result = await onUpload(parseResult.valid);
    setUploadResult(result);
  };

  const reset = () => {
    setParseResult(null);
    setUploadResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const isOverCap = (parseResult?.valid.length ?? 0) > MAX_USERS;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] border-stone-200 rounded-md p-0 overflow-hidden">
        <div className="p-6 pb-0">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="border border-stone-200 w-8 h-8 flex items-center justify-center">
                <FileSpreadsheet
                  className="size-4 text-primary"
                  strokeWidth={1.5}
                />
              </div>
              <DialogTitle className="text-lg font-light tracking-tight">
                Import Pengguna Massal
              </DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-stone-400 mt-1.5">
            Upload CSV atau Excel. Maks. {MAX_USERS} pengguna per upload.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Template Downloads */}
          <div className="flex items-center gap-4 border border-stone-600 dark:border-stone-400 rounded-md p-3">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
              Template:
            </span>
            <button
              onClick={downloadCSVTemplate}
              className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-200 hover:text-primary transition-colors"
            >
              <FileText className="size-3.5" strokeWidth={1.5} />
              CSV
            </button>
            <button
              onClick={downloadExcelTemplate}
              className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-200 hover:text-primary transition-colors"
            >
              <FileSpreadsheet className="size-3.5" strokeWidth={1.5} />
              Excel
            </button>
          </div>

          {/* Drop Zone */}
          {!uploadResult && !isUploading && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) processFile(file);
              }}
              onClick={() => fileRef.current?.click()}
              className={`
                relative flex flex-col items-center justify-center gap-3
                h-36 border-2 border-dashed cursor-pointer rounded-md
                transition-all duration-200
                ${isDragging ? "border-primary bg-primary/5" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 "}
              `}
            >
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={(e) =>
                  e.target.files?.[0] && processFile(e.target.files[0])
                }
                className="hidden"
              />
              <Upload
                className={`size-5 ${parseResult ? "text-emerald-600" : "text-stone-400"}`}
                strokeWidth={1.5}
              />
              {parseResult ? (
                <>
                  <p className="text-sm text-stone-700">
                    {parseResult.fileName}
                  </p>
                  <p className="text-xs text-stone-400">
                    {parseResult.valid.length + parseResult.errors.length} baris
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Drag & drop atau klik untuk pilih file
                  </p>
                  <p className="text-xs text-stone-400">CSV · Excel</p>
                </>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2 border border-stone-200 rounded-md p-4">
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Mengupload...</span>
                <span className="text-stone-400">
                  {progress.processed} / {progress.total}
                </span>
              </div>
              <div className="h-0.5 bg-stone-200 overflow-hidden rounded-full">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(progress.processed / progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Parse Result */}
          {parseResult && !uploadResult && !isUploading && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-stone-200 rounded-md p-3 text-center">
                  <p className="text-2xl font-light text-stone-900">
                    {parseResult.valid.length}
                  </p>
                  <p className="text-xs text-stone-400 uppercase tracking-wide mt-0.5">
                    Siap diimport
                  </p>
                </div>
                <div className="border border-stone-200 rounded-md p-3 text-center">
                  <p className="text-2xl font-light text-stone-900">
                    {parseResult.errors.length}
                  </p>
                  <p className="text-xs text-stone-400 uppercase tracking-wide mt-0.5">
                    Baris error
                  </p>
                </div>
              </div>

              {isOverCap && (
                <div className="flex gap-2 border border-amber-200 rounded-md p-3 bg-amber-50">
                  <AlertTriangle
                    className="size-4 text-amber-600 shrink-0 mt-0.5"
                    strokeWidth={1.5}
                  />
                  <p className="text-xs text-stone-600">
                    Melebihi batas {MAX_USERS} pengguna. Pecah menjadi beberapa
                    file.
                  </p>
                </div>
              )}

              {parseResult.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Error pada baris:
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {parseResult.errors.slice(0, 5).map((e, i) => (
                      <div
                        key={i}
                        className="flex gap-2 text-xs border-l-2 border-red-500 rounded-md pl-3 py-1.5 bg-red-50"
                      >
                        <span className="text-stone-600 font-medium">
                          Baris {e.row}:
                        </span>
                        <span className="text-stone-500">{e.reason}</span>
                      </div>
                    ))}
                    {parseResult.errors.length > 5 && (
                      <p className="text-xs text-stone-400 text-center pt-1">
                        +{parseResult.errors.length - 5} error lainnya
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Result Summary */}
          {uploadResult && (
            <div
              className={`border rounded-md p-4 ${uploadResult.failed.length === 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
            >
              <div className="flex gap-3">
                {uploadResult.failed.length === 0 ? (
                  <CheckCircle2
                    className="size-5 text-emerald-600 shrink-0"
                    strokeWidth={1.5}
                  />
                ) : (
                  <AlertTriangle
                    className="size-5 text-amber-600 shrink-0"
                    strokeWidth={1.5}
                  />
                )}
                <div>
                  <p className="text-sm text-stone-700">
                    {uploadResult.succeeded.length} berhasil,{" "}
                    {uploadResult.failed.length} gagal
                  </p>
                  {uploadResult.failed.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {uploadResult.failed.slice(0, 3).map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs"
                        >
                          <XCircle
                            className="size-3 text-red-500"
                            strokeWidth={1.5}
                          />
                          <span className="text-stone-600">{f.user.email}</span>
                          <span className="text-stone-400">- {f.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-stone-200 mt-2">
            {uploadResult ? (
              <Button
                onClick={handleClose}
                className="rounded-md bg-primary hover:bg-primary/90 h-9 px-4 text-sm font-normal"
              >
                Selesai
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={reset}
                  disabled={isUploading || !parseResult}
                  className="rounded-md border-stone-200 text-stone-600 hover:bg-stone-50 h-9 px-4 text-sm font-normal"
                >
                  Reset
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={
                    !parseResult ||
                    parseResult.valid.length === 0 ||
                    isOverCap ||
                    isUploading
                  }
                  className="rounded-md bg-primary hover:bg-primary/90 h-9 px-4 text-sm font-normal"
                >
                  {isUploading ? (
                    <>
                      <Loader2
                        className="mr-2 size-3.5 animate-spin"
                        strokeWidth={1.5}
                      />
                      Mengupload...
                    </>
                  ) : (
                    `Import ${parseResult?.valid.length ?? 0} Pengguna`
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
