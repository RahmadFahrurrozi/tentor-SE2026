import { supabase } from "@/lib/supabase";
import { REGIONS } from "@/config/regionConfig";
import { assignSlsToPoints } from "@/utils/dataProcessing";
import { DATASET_VERSION } from "@/store/mapStore";

export interface SpatialChunkParams {
  kecId: string;
  selectedKabupaten: string;
  activeDatasetVersion: string;
}

const KODE_KAB_BANYUWNAGI = "3510";

export const spatialService = {
  async getKecamatanChunks({
    kecId,
    selectedKabupaten,
    activeDatasetVersion,
  }: SpatialChunkParams) {
    const region = REGIONS[selectedKabupaten] || REGIONS[KODE_KAB_BANYUWNAGI];
    let primaryBucket = region.bucketName;
    if (
      selectedKabupaten === KODE_KAB_BANYUWNAGI &&
      activeDatasetVersion !== DATASET_VERSION.SE2026
    ) {
      primaryBucket = "spatial-chunks";
    }

    const fetchChunkSafe = async (dataset: string, bucketOverride?: string) => {
      try {
        const bucket = bucketOverride || primaryBucket;
        const path = `${dataset}/kec_${kecId}.json`;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        const res = await fetch(data.publicUrl);
        if (!res.ok) return [];
        const json = await res.json();
        return json.data || json || [];
      } catch {
        return [];
      }
    };

    const fetchSlsChunkSafe = async () => {
      try {
        const path = `sls/kec_${kecId}.json`;
        const { data: d1 } = supabase.storage
          .from(primaryBucket)
          .getPublicUrl(path);
        let res = await fetch(d1.publicUrl);
        if (
          !res.ok &&
          selectedKabupaten === "3510" &&
          activeDatasetVersion === "se2026"
        ) {
          const { data: d2 } = supabase.storage
            .from("spatial-chunks")
            .getPublicUrl(path);
          res = await fetch(d2.publicUrl);
        }
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    };
    const [
      usaha,
      usahaDigital,
      usahaPertanianRaw,
      rumahTangga,
      bangunan,
      bangunanLainnya,
      sls,
    ] = await Promise.all([
      fetchChunkSafe("usaha"),
      fetchChunkSafe("usaha_digital"),
      fetchChunkSafe("usaha_pertanian"),
      fetchChunkSafe("rumah_tangga"),
      selectedKabupaten === KODE_KAB_BANYUWNAGI
        ? fetchChunkSafe("bangunan", "spatial-chunks")
        : Promise.resolve([]),
      selectedKabupaten === KODE_KAB_BANYUWNAGI
        ? fetchChunkSafe("bangunan", "spatial-chunks-se2026")
        : fetchChunkSafe("bangunan"),
      fetchSlsChunkSafe(),
    ]);
    const usahaPertanian = assignSlsToPoints(usahaPertanianRaw, sls);
    return {
      usaha,
      usahaDigital,
      usahaPertanian,
      rumahTangga,
      bangunan,
      bangunanLainnya,
      sls,
    };
  },
};
