import { create } from 'zustand';

export type DatasetVersion = 'prelist' | 'se2026';
export type KabupatenId = '3510' | '3515';

export const DATASET_VERSION = {
  PRELIST: 'prelist',
  SE2026: 'se2026',
} as const;

export type DatasetType = (typeof DATASET_VERSION)[keyof typeof DATASET_VERSION];

interface MapState {
  // Region Selection
  selectedKabupaten: KabupatenId;

  // Layer Visibility
  showKab: boolean;
  showSls: boolean;
  showUsaha: boolean;
  showUsahaDigital: boolean;
  showUsahaPertanian: boolean;   
  showRt: boolean;
  showBangunanLainnya: boolean;
  showBuild: boolean;
  showSyntheticBuildings: boolean;
  enable3d: boolean;
  showCounting: boolean;

  // Filter Wilayah
  filterKecamatan: string | null;
  filterDesa: string | null;
  filterDusun: string | null;
  filterSls: string | null;
  filterNama: string;

  // Opacity
  slsOpacity: number;
  buildOpacity: number;

  // Features
  activeDatasetVersion: DatasetVersion;
  isCompareMode: boolean;
  isStatisticsOpen: boolean;

  // Actions
  setKabupaten: (kabId: KabupatenId) => void;
  toggleLayer: (layer: keyof MapState) => void;
  setFilter: (key: keyof MapState, value: any) => void;
  resetFilter: (role?: string, assignedDesas?: string[], allKecamatans?: any[]) => void;
  setDatasetVersion: (version: DatasetVersion) => void;
  setCompareMode: (enabled: boolean) => void;
  setStatisticsOpen: (open: boolean) => void;
  toggleStatisticsOpen: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  // Default values
  selectedKabupaten: '3510', // Default Banyuwangi

  showKab: false,
  showSls: true,
  showUsaha: false,
  showUsahaDigital: false,
  showUsahaPertanian: false,    
  showRt: false,
  showBangunanLainnya: false,
  showBuild: true,
  showSyntheticBuildings: false,
  enable3d: false,
  showCounting: true,

  filterKecamatan: "Semua",
  filterDesa: "Semua",
  filterDusun: "Semua",
  filterSls: "Semua",
  filterNama: "",

  slsOpacity: 0.3,
  buildOpacity: 0.6,

  activeDatasetVersion: 'se2026',
  isCompareMode: false,
  isStatisticsOpen: true,

  setKabupaten: (kabId: KabupatenId) => {
    set({
      selectedKabupaten: kabId,
      filterKecamatan: "Semua",
      filterDesa: "Semua",
      filterDusun: "Semua",
      filterSls: "Semua",
      filterNama: "",
      // Jika Sidoarjo (3515), otomatis matikan compare mode & kunci ke se2026
      ...(kabId === '3515' ? {
        activeDatasetVersion: 'se2026',
        isCompareMode: false,
      } : {})
    });
  },

  toggleLayer: (layer) => set((state) => ({ [layer]: !state[layer as keyof MapState] })),

  setFilter: (key: string, value: any) => set({ [key]: value }),

  resetFilter: (role, assignedDesas, allKecamatans) => {
    set({
      filterKecamatan: "Semua",
      filterDesa: "Semua",
      filterDusun: "Semua",
      filterSls: "Semua",
      filterNama: "",
    });

    if (role === "ppl" && assignedDesas && assignedDesas.length > 0 && allKecamatans) {
      for (const kec of allKecamatans) {
        const hasAssignedDesa = kec.desa?.some((d: any) =>
          assignedDesas.includes(d.iddesa)
        );
        if (hasAssignedDesa) {
          set({ filterKecamatan: kec.idkec });
          const firstDesa = kec.desa?.find((d: any) =>
            assignedDesas.includes(d.iddesa)
          );
          if (firstDesa) {
            set({ filterDesa: firstDesa.iddesa });
          }
          break;
        }
      }
    }
  },

  setDatasetVersion: (version) => set({ activeDatasetVersion: version }),
  setCompareMode: (enabled) => set({ isCompareMode: enabled }),
  setStatisticsOpen: (open) => set({ isStatisticsOpen: open }),
  toggleStatisticsOpen: () => set((state) => ({ isStatisticsOpen: !state.isStatisticsOpen })),
}));