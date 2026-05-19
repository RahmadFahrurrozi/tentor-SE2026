import { create } from 'zustand';

interface MapState {
  // Layer Visibility
  showKab: boolean;
  showSls: boolean;
  showUsaha: boolean;
  showUsahaDigital: boolean;
  showRt: boolean;
  showBuild: boolean;
  enable3d: boolean;
  showCounting: boolean;

  // Filter Wilayah
  filterKecamatan: string;
  filterDesa: string;
  filterNama: string;

  // Opacity
  slsOpacity: number;
  buildOpacity: number;

  // Actions
  toggleLayer: (layer: keyof MapState) => void;
  setFilter: (key: keyof MapState, value: any) => void;
}

export const useMapStore = create<MapState>((set) => ({
  // Default values berdasarkan Streamlit
  showKab: true,
  showSls: true,
  showUsaha: true, // Default true agar terlihat
  showUsahaDigital: false,
  showRt: false,
  showBuild: true, // Default true sesuai request user
  enable3d: true,  // Aktifkan 3D secara default
  showCounting: true, // Choropleth aktif default

  filterKecamatan: 'Semua',
  filterDesa: 'Semua',
  filterNama: '',

  slsOpacity: 0.3,
  buildOpacity: 0.6,

  toggleLayer: (layer) => set((state) => ({ [layer]: !state[layer as keyof MapState] })),
  setFilter: (key, value) => set(() => ({ [key]: value })),
}));
