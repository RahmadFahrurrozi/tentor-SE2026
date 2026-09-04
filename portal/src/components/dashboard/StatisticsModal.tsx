import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Download,
  FileSpreadsheet,
  Building2,
  Store,
  Home,
  Laptop,
  ShieldCheck,
} from "lucide-react";
import { useStatisticsModal } from "@/hooks/use-statistics-modal";

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spatialData: any;
}

export function StatisticsModal({
  isOpen,
  onClose,
  spatialData,
}: StatisticsModalProps) {
  const {
    roleName,
    isAdmin,
    regionLabel,
    stats,
    pieData,
    barData,
    handleExportCSV,
    handleExportExcel,
  } = useStatisticsModal(spatialData);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <div>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl font-bold">
                Statistik & Insight Wilayah
              </DialogTitle>
              <Badge variant="outline" className="text-xs font-semibold">
                Role: {roleName}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Data teragregasi untuk:{" "}
              <span className="font-semibold text-foreground">
                {regionLabel}
              </span>
            </DialogDescription>
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                className="text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button
                size="sm"
                onClick={handleExportExcel}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
              </Button>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-md border">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Export
              khusus Admin
            </div>
          )}
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <Card className="bg-card/50">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Bangunan
              </CardTitle>
              <Building2 className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold">
                {stats.totalBangunan.toLocaleString()}
              </div>
              <p className="text-[10px] text-emerald-500 mt-0.5">
                {stats.progressPct}% Terkunjungi
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Titik Usaha Biasa
              </CardTitle>
              <Store className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold">
                {stats.totalUsaha.toLocaleString()}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Sektor Non-Pertanian
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Usaha Digital
              </CardTitle>
              <Laptop className="w-4 h-4 text-pink-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold">
                {stats.totalUsahaDigital.toLocaleString()}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                E-Commerce & Online
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Keluarga (KK)
              </CardTitle>
              <Home className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold">
                {stats.totalRt.toLocaleString()}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Kepala Keluarga (KK)
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="visual">Visual Chart Insight</TabsTrigger>
            <TabsTrigger value="table">Tabel Rincian Data</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h4 className="text-sm font-semibold mb-3">
                  Status Kunjungan Bangunan
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="text-sm font-semibold mb-3">
                  Sebaran Entitas Spasial
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Bar dataKey="jumlah" radius={[6, 6, 0, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="table">
            <Card className="p-4 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b bg-muted/50 font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-2.5">Kategori Indikator</th>
                    <th className="p-2.5 text-right">Jumlah / Nilai</th>
                    <th className="p-2.5 text-right">Proporsi (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-2.5 font-medium">Bangunan Dikunjungi</td>
                    <td className="p-2.5 text-right font-bold text-emerald-600">
                      {stats.sudahKunjung.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-medium">
                      {stats.progressPct}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">
                      Bangunan Belum Dikunjungi
                    </td>
                    <td className="p-2.5 text-right font-bold text-rose-500">
                      {stats.belumKunjung.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-medium">
                      {100 - stats.progressPct}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Total Bangunan Fisik</td>
                    <td className="p-2.5 text-right font-bold">
                      {stats.totalBangunan.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-medium">100%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Titik Usaha Biasa</td>
                    <td className="p-2.5 text-right font-bold text-amber-500">
                      {stats.totalUsaha.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-medium">-</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Titik Usaha Digital</td>
                    <td className="p-2.5 text-right font-bold text-pink-500">
                      {stats.totalUsahaDigital.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-medium">-</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Titik Usaha Pertanian</td>
                    <td className="p-2.5 text-right font-bold text-emerald-500">
                      {stats.totalUsahaPertanian.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-medium">-</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Titik Keluarga (KK)</td>
                    <td className="p-2.5 text-right font-bold text-blue-500">
                      {stats.totalRt.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-medium">-</td>
                  </tr>
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
