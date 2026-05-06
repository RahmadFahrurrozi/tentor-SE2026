import React, { useState, useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Map as MapIcon,
  RefreshCw,
  HardDrive,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useNavigate } from "react-router-dom";

export default function DataUploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [dataType, setDataType] = useState("data-usaha"); // default

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setStatus("idle");
      setProgress(0);
    }
  }, []);

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      toast.error(
        "Format file tidak didukung! Harap upload file Excel (.xlsx, .xls) atau Parquet.",
      );
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      onDropRejected,
      maxFiles: 1,
      accept: {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
          ".xlsx",
        ],
        "application/vnd.ms-excel": [".xls"],
        "text/csv": [".csv"],
        "application/json": [".json", ".geojson"],
        "application/octet-stream": [".parquet"],
      },
    });

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setStatus("idle");
    setProgress(0);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatus("uploading");
    setProgress(10);

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Otomatis ubah nama file sesuai pilihan dropdown, pertahankan ekstensi asli
      const originalExt = file.name
        .substring(file.name.lastIndexOf("."))
        .toLowerCase();
      const targetFileName = `${dataType}${originalExt}`;

      const { error } = await supabase.storage
        .from("spatial-data")
        .upload(targetFileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      clearInterval(progressInterval);

      if (error) {
        throw error;
      }

      setProgress(100);
      setStatus("success");
      toast.success(`File berhasil diunggah sebagai ${targetFileName}!`);
    } catch (err: any) {
      console.error("Upload error:", err);
      setStatus("error");
      setErrorMessage(err.message || "Terjadi kesalahan saat mengunggah file.");
      toast.error("Upload gagal: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Section */}
        <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/users")}
              className="border border-stone-200 dark:border-zinc-800 text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-800 rounded-xl h-12 w-12 p-0 mr-2"
            >
              <ArrowLeft className="size-5" strokeWidth={1.5} />
            </Button>
            <div className="border border-primary/20 bg-primary/10 p-3 rounded-xl shadow-sm">
              <HardDrive className="size-6 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-light text-foreground tracking-tight">
                Upload Data
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Unggah data lapangan (.xlsx, .parquet) langsung ke Cloud Storage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ModeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Area */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border shadow-sm rounded-2xl p-8 overflow-hidden relative">
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block text-foreground/80">
                  Kategori Data
                </label>
                <select
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value)}
                  disabled={uploading || status === "success"}
                  className="w-full h-11 px-4 text-sm rounded-md border border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors"
                >
                  <option value="data-usaha">Data Titik Usaha</option>
                  <option value="data-usaha-digital">
                    Data Titik Usaha Digital
                  </option>
                  <option value="data-bangunan">Data Titik Bangunan</option>
                  <option value="data-rumah-tangga">Data Rumah Tangga</option>
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  Sistem akan secara otomatis merename file yang Anda upload
                  sesuai kategori yang dipilih agar langsung dikenali oleh Peta.
                </p>
              </div>

              <div
                {...getRootProps()}
                className={`
                  relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 ease-in-out cursor-pointer
                  flex flex-col items-center justify-center min-h-[300px] group mt-4
                  ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-stone-50/50 dark:hover:bg-zinc-800/50"}
                  ${isDragReject ? "border-red-500 bg-red-50 dark:bg-red-900/10" : ""}
                  ${file ? "border-primary/30 bg-primary/5" : ""}
                `}
              >
                <input {...getInputProps()} />

                <AnimatePresence mode="wait">
                  {!file ? (
                    <motion.div
                      key="no-file"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col items-center text-center"
                    >
                      <div className="bg-primary/10 p-4 rounded-full mb-6 text-primary">
                        <Upload size={40} strokeWidth={1} />
                      </div>

                      <h3 className="text-xl font-medium text-foreground mb-2">
                        {isDragActive
                          ? "Lepaskan file di sini"
                          : "Drag & Drop file data"}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                        Mendukung format file .xlsx, .csv, dan .parquet. (Maks
                        50 MB)
                      </p>

                      <Button
                        variant="outline"
                        className="rounded-full px-6 font-normal pointer-events-none"
                      >
                        Browse Files
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="has-file"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center w-full"
                    >
                      <div className="relative bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-border w-full max-w-sm flex flex-col items-center">
                        <button
                          onClick={clearFile}
                          disabled={uploading}
                          className="absolute -top-3 -right-3 bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 p-1.5 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          <X size={16} />
                        </button>

                        <div className="bg-emerald-100 dark:bg-emerald-900/40 p-4 rounded-full mb-4 text-emerald-600 dark:text-emerald-400">
                          <FileSpreadsheet size={36} strokeWidth={1.5} />
                        </div>

                        <h4 className="text-base font-medium text-foreground text-center truncate w-full px-4 mb-1">
                          {file.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>

                        {status === "uploading" && (
                          <div className="w-full mt-6 space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Mengunggah...</span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2 w-full" />
                          </div>
                        )}

                        {status === "success" && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 flex items-center text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-lg w-full justify-center gap-2"
                          >
                            <CheckCircle2 size={18} />
                            <span>Upload Selesai!</span>
                          </motion.div>
                        )}

                        {status === "error" && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 flex flex-col items-center text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg w-full gap-1 text-center"
                          >
                            <div className="flex items-center gap-2 font-medium">
                              <AlertCircle size={18} />
                              <span>Upload Gagal</span>
                            </div>
                            <span className="text-xs opacity-80">
                              {errorMessage}
                            </span>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    clearFile(e);
                  }}
                  disabled={!file || uploading}
                  className="rounded-full font-normal"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading || status === "success"}
                  className="rounded-full px-8 shadow-md font-normal bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="mr-2 size-4 animate-spin" />
                      Memproses...
                    </>
                  ) : status === "success" ? (
                    <>
                      <CheckCircle2 className="mr-2 size-4" />
                      Tersimpan
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 size-4" />
                      Upload ke Cloud
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-6">
            <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
              <h3 className="text-lg font-medium tracking-tight mb-4 flex items-center gap-2">
                <MapIcon className="size-5 text-primary" strokeWidth={1.5} />
                Instruksi Upload
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="bg-stone-100 dark:bg-zinc-800 p-1 rounded mt-0.5">
                    1
                  </div>
                  <span>
                    Pilih <b>Kategori Data</b> pada menu Dropdown.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="bg-stone-100 dark:bg-zinc-800 p-1 rounded mt-0.5">
                    2
                  </div>
                  <span>
                    Seret dan lepas file data Anda. System akan{" "}
                    <b>otomatis mengganti</b> nama file Anda menjadi nama
                    standar
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="bg-stone-100 dark:bg-zinc-800 p-1 rounded mt-0.5">
                    3
                  </div>
                  <span>
                    Jika Anda meng-upload Excel (.xlsx), system akan mengubah
                    file Excel tersebut menjadi file <b>Parquet</b>. File
                    Parquet inilah yang nantinya akan terhubung ke <b>Map</b>.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
              <h3 className="font-medium text-primary/80 mb-2">
                Informasi Kapasitas Penyimpanan
              </h3>
              <p className="text-sm text-primary/70 leading-relaxed mb-4">
                Informasi kapasitas Storage (Estimasi). Batas maksimal adalah{" "}
                <b>50 MB</b> per file upload.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
