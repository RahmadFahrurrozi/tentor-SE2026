import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useMapStore, type DatasetVersion } from "@/store/mapStore";
import { useAuthStore } from "@/store/auth-store";
import { REGIONS } from "@/config/regionConfig";
import { getUserRegionAccess } from "@/utils/regionAccess";
import { useQuery } from "@tanstack/react-query";
import { spatialService } from "@/services/spatial.service";

export function useSpatialData(versionOverride?: DatasetVersion) {
  const [dataUsaha, setDataUsaha] = useState<any[]>([]);
  const [dataUsahaDigital, setDataUsahaDigital] = useState<any[]>([]);
  const [dataUsahaPertanian, setDataUsahaPertanian] = useState<any[]>([]);
  const [dataRumahTangga, setDataRumahTangga] = useState<any[]>([]);
  const [dataBangunan, setDataBangunan] = useState<any[]>([]);
  const [dataBangunanLainnya, setDataBangunanLainnya] = useState<any[]>([]);
  const [dataSls, setDataSls] = useState<any>(null);
  const [dataKab, setDataKab] = useState<any>(null);
  const [dataDesa, setDataDesa] = useState<any>(null);

  const [wilayahManifest, setWilayahManifest] = useState<any>(null);
  const [isLoadingManifest, setIsLoadingManifest] = useState(true);

  const [assignments, setAssignments] = useState<
    { idkec: string | null; iddesa: string | null }[]
  >([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  const { profile, user } = useAuthStore();
  const selectedKabupaten = useMapStore((state) => state.selectedKabupaten);
  const filterKecamatan = useMapStore((state) => state.filterKecamatan);
  const storeActiveDatasetVersion = useMapStore(
    (state) => state.activeDatasetVersion,
  );
  const activeDatasetVersion = versionOverride ?? storeActiveDatasetVersion;
  const setFilter = useMapStore((state) => state.setFilter);

  // Sync region access on profile/user mount
  useEffect(() => {
    const access = getUserRegionAccess(profile, user, assignments);
    if (
      access.lockedKabupaten &&
      selectedKabupaten !== access.lockedKabupaten
    ) {
      useMapStore.getState().setKabupaten(access.lockedKabupaten);
    }
  }, [profile, user, assignments, selectedKabupaten]);



  const getChunksPublicUrl = (
    path: string,
    bucketName: string = "spatial-chunks",
  ) => {
    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
    return data.publicUrl;
  };

  const getDataPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("spatial-data").getPublicUrl(path);
    return data.publicUrl;
  };

  // Reset data when switching kabupaten
  useEffect(() => {
    setDataUsaha([]);
    setDataUsahaDigital([]);
    setDataUsahaPertanian([]);
    setDataRumahTangga([]);
    setDataBangunan([]);
    setDataBangunanLainnya([]);
    setDataSls(null);
  }, [selectedKabupaten]);

  // 1. Manifest wilayah
  useEffect(() => {
    let isCurrent = true;
    async function loadManifest() {
      try {
        setIsLoadingManifest(true);
        // Clear previous region manifest immediately so stale data is never shown
        setWilayahManifest(null);

        const region = REGIONS[selectedKabupaten] || REGIONS["3510"];
        let targetBucket = region.bucketName;
        if (selectedKabupaten === "3510" && activeDatasetVersion !== "se2026") {
          targetBucket = "spatial-chunks";
        }

        let response = await fetch(
          getChunksPublicUrl("wilayah_manifest.json", targetBucket),
        );
        if (!response.ok && selectedKabupaten === "3510") {
          response = await fetch(
            getChunksPublicUrl("wilayah_manifest.json", "spatial-chunks"),
          );
        }
        if (!response.ok)
          throw new Error(
            `Gagal mengambil manifest wilayah untuk ${region.name}`,
          );
        const data = await response.json();
        if (isCurrent) {
          setWilayahManifest(data);
        }
      } catch (err: any) {
        if (isCurrent) {
          console.error("[SpatialData] Gagal load wilayah manifest:", err);
        }
      } finally {
        if (isCurrent) {
          setIsLoadingManifest(false);
        }
      }
    }
    loadManifest();
    return () => {
      isCurrent = false;
    };
  }, [selectedKabupaten, activeDatasetVersion]);

  // 2. Outline kabupaten
  useEffect(() => {
    let isCurrent = true;
    async function loadKab() {
      try {
        if (selectedKabupaten === "3515") {
          const res = await fetch("/data/peta-kabupaten-sidoarjo.geojson");
          if (res.ok) {
            const geojson = await res.json();
            if (isCurrent) setDataKab(geojson);
            return;
          }
        } else if (selectedKabupaten === "3577") {
          const res = await fetch("/data/peta-kabupaten-madiun.geojson");
          if (res.ok) {
            const geojson = await res.json();
            if (isCurrent) setDataKab(geojson);
            return;
          }
        }
        const kabUrl = getDataPublicUrl("peta-kabupaten-banyuwangi.geojson");
        const response = await fetch(kabUrl);
        if (response.ok) {
          const geojson = await response.json();
          if (isCurrent) setDataKab(geojson);
        }
      } catch (err) {
        console.error("Gagal load peta kabupaten:", err);
      }
    }
    loadKab();
    return () => {
      isCurrent = false;
    };
  }, [selectedKabupaten]);

  // 2b. Outline desa
  useEffect(() => {
    let isCurrent = true;
    async function loadDesa() {
      try {
        const regionFile =
          selectedKabupaten === "3515"
            ? "/data/sidoarjo-regions.json"
            : selectedKabupaten === "3577"
              ? "/data/madiun-regions.json"
              : "/data/regions.json";
        const response = await fetch(regionFile);
        if (response.ok) {
          const geojson = await response.json();
          if (isCurrent) setDataDesa(geojson);
        }
      } catch (err) {
        console.error("Gagal load peta desa regions:", err);
      }
    }
    loadDesa();
    return () => {
      isCurrent = false;
    };
  }, [selectedKabupaten]);

  // 3. Penugasan user
  useEffect(() => {
    async function loadAssignments() {
      if (!profile) {
        setIsLoadingAssignments(false);
        return;
      }
      if (profile.role === "admin") {
        setIsLoadingAssignments(false);
        return;
      }

      try {
        setIsLoadingAssignments(true);
        const { data, error: err } = await supabase
          .from("assignments")
          .select("idkec, iddesa")
          .eq("user_id", profile.id);

        if (err) throw err;

        const userAssignments = data || [];
        setAssignments(userAssignments);

        const assignedKecs = Array.from(
          new Set(userAssignments.map((a: any) => a.idkec).filter(Boolean)),
        ) as string[];

        if (assignedKecs.length > 0) {
          const activeKec = useMapStore.getState().filterKecamatan;
          if (
            activeKec === "Semua" ||
            activeKec === null ||
            !assignedKecs.includes(activeKec)
          ) {
            setFilter("filterKecamatan", assignedKecs[0]);
          }
        }
      } catch (err) {
        console.error("Gagal load assignments user:", err);
      } finally {
        setIsLoadingAssignments(false);
      }
    }
    loadAssignments();
  }, [profile]);

  // 4. Fetch data per kecamatan via TanStack Query (Global Cache)
  const isKecamatanValid = Boolean(
    filterKecamatan && filterKecamatan !== "Semua" && filterKecamatan !== "0",
  );

  const {
    data: spatialChunksData,
    isLoading: isLoadingChunks,
    error: chunksError,
  } = useQuery({
    queryKey: [
      "spatial-chunks",
      selectedKabupaten,
      activeDatasetVersion,
      filterKecamatan,
    ],
    queryFn: () =>
      spatialService.getKecamatanChunks({
        kecId: String(filterKecamatan),
        selectedKabupaten,
        activeDatasetVersion,
      }),
    enabled: isKecamatanValid,
    staleTime: 1000 * 60 * 60,
  });

  // Sinkronkan data hasil TanStack Query ke state
  useEffect(() => {
    if (!isKecamatanValid) {
      setDataUsaha([]);
      setDataUsahaDigital([]);
      setDataUsahaPertanian([]);
      setDataRumahTangga([]);
      setDataBangunan([]);
      setDataBangunanLainnya([]);
      setDataSls(null);
      return;
    }

    if (spatialChunksData) {
      setDataUsaha(spatialChunksData.usaha);
      setDataUsahaDigital(spatialChunksData.usahaDigital);
      setDataUsahaPertanian(spatialChunksData.usahaPertanian);
      setDataRumahTangga(spatialChunksData.rumahTangga);
      setDataBangunan(
        spatialChunksData.bangunan && spatialChunksData.bangunan.length > 0
          ? spatialChunksData.bangunan
          : spatialChunksData.bangunanLainnya,
      );
      setDataBangunanLainnya(spatialChunksData.bangunanLainnya);
      setDataSls(spatialChunksData.sls);
    }
  }, [spatialChunksData, isKecamatanValid]);

  const isLoading =
    isLoadingManifest ||
    isLoadingAssignments ||
    (isKecamatanValid && isLoadingChunks);

  const error = chunksError ? (chunksError as Error).message : null;

  return {
    dataUsaha,
    dataUsahaDigital,
    dataUsahaPertanian,
    dataRumahTangga,
    dataBangunan,
    dataBangunanLainnya,
    dataSls,
    dataKab,
    dataDesa,
    isLoading,
    error,
    wilayahManifest,
    isLoadingManifest,
    assignments,
    isLoadingAssignments,
  };
}
