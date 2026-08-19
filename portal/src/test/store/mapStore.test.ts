import { describe, it, expect, beforeEach } from "vitest";
import { useMapStore } from "@/store/mapStore";

describe("mapStore state & actions", () => {
  beforeEach(() => {
    useMapStore.setState({
      filterKecamatan: "Semua",
      filterDesa: "Semua",
      filterNama: "",
      activeDatasetVersion: "prelist",
      isCompareMode: false,
      isStatisticsOpen: false,
      showUsahaPertanian: false,
    });
  });

  it("should initialize default state correctly", () => {
    const state = useMapStore.getState();
    expect(state.filterKecamatan).toBe("Semua");
    expect(state.filterDesa).toBe("Semua");
    expect(state.activeDatasetVersion).toBe("prelist");
    expect(state.isCompareMode).toBe(false);
  });

  it("should update dataset version when setDatasetVersion is called", () => {
    useMapStore.getState().setDatasetVersion("se2026");
    expect(useMapStore.getState().activeDatasetVersion).toBe("se2026");
  });

  it("should toggle compare mode state", () => {
    useMapStore.getState().setCompareMode(true);
    expect(useMapStore.getState().isCompareMode).toBe(true);
  });

  it("should reset filters back to 'Semua' cleanly", () => {
    useMapStore.getState().setFilter("filterKecamatan", "3510010");
    useMapStore.getState().setFilter("filterDesa", "3510010001");
    expect(useMapStore.getState().filterKecamatan).toBe("3510010");

    useMapStore.getState().resetFilter("admin");
    expect(useMapStore.getState().filterKecamatan).toBe("Semua");
    expect(useMapStore.getState().filterDesa).toBe("Semua");
  });

  it("should toggle layer visibility correctly", () => {
    expect(useMapStore.getState().showUsahaPertanian).toBe(false);
    useMapStore.getState().toggleLayer("showUsahaPertanian");
    expect(useMapStore.getState().showUsahaPertanian).toBe(true);
  });
});
