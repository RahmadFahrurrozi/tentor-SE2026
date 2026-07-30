// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
expect.extend(matchers);

import { StatisticsPanel } from "../StatisticsPanel";

let currentRole = "admin";

vi.mock("@/store/auth-store", () => ({
  useAuthStore: (selector?: any) => {
    const state = { profile: { id: "u1", role: currentRole, full_name: "Test User", email: "test@bps.go.id" } };
    return selector ? selector(state) : state;
  },
}));

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div data-testid="pie-chart" />,
  Cell: () => null,
  Legend: () => null,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div data-testid="bar-chart" />,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

describe("StatisticsPanel integration & role protection", () => {
  const mockSpatialData = {
    dataBangunan: [{ id: 1 }, { id: 2 }],
    dataUsaha: [{ id: "u1" }],
    dataUsahaDigital: [],
    dataUsahaPertanian: [],
    dataRumahTangga: [{ id: "r1" }],
    dataSls: { features: [] },
    wilayahManifest: { kecamatan: [] },
  };

  beforeEach(() => {
    cleanup();
  });

  it("should render export buttons when user is Admin", () => {
    currentRole = "admin";

    render(
      <StatisticsPanel
        spatialData={mockSpatialData}
      />
    );

    expect(screen.getByText("Excel")).toBeInTheDocument();
    expect(screen.getByText("CSV")).toBeInTheDocument();
  });

  it("should hide export buttons when user is non-admin (PPL)", () => {
    currentRole = "ppl";

    render(
      <StatisticsPanel
        spatialData={mockSpatialData}
      />
    );

    expect(screen.queryByText("Excel")).not.toBeInTheDocument();
    expect(screen.getByText(/Export \(PML\/Admin\)/i)).toBeInTheDocument();
  });
});
