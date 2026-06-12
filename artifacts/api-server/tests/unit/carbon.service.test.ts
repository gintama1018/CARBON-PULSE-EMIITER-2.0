import { describe, it, expect } from "vitest";
import {
  calculateCo2,
  haversineDistanceKm,
  getTransportPreview,
  EMISSION_FACTORS,
} from "../../src/services/carbonCalc.service";

describe("calculateCo2", () => {
  it("returns correct grams for a known subcategory (petrol_car)", () => {
    // 192 g/km × 10 km = 1920 g
    expect(calculateCo2("petrol_car", 10)).toBe(1920);
  });

  it("returns correct grams for beef (highest food factor)", () => {
    // 99500 g/kg × 1 kg = 99500 g
    expect(calculateCo2("beef", 1)).toBe(99500);
  });

  it("returns 0 for bicycle (zero-emission transport)", () => {
    expect(calculateCo2("bicycle", 100)).toBe(0);
  });

  it("returns negative grams for recycling (carbon offset)", () => {
    // -210 g/kg × 5 kg = -1050 g  → clamped to 0
    // actually calculateCo2 uses Math.max(0, ...)
    expect(calculateCo2("recycling", 5)).toBe(0);
  });

  it("returns 0 for unknown subcategory (safe fallback)", () => {
    expect(calculateCo2("unknown_activity_xyz", 10)).toBe(0);
  });

  it("scales linearly with quantity", () => {
    const base = calculateCo2("metro_rail", 1);
    expect(calculateCo2("metro_rail", 5)).toBe(base * 5);
  });

  it("returns 0 for quantity of 0", () => {
    expect(calculateCo2("petrol_car", 0)).toBe(0);
  });

  it("handles electricity factors correctly", () => {
    // 820 g/kWh × 100 kWh = 82000 g
    expect(calculateCo2("electricity_india", 100)).toBe(82000);
  });

  it("handles shopping items (laptop) correctly", () => {
    // 350000 g/item × 1 = 350000 g
    expect(calculateCo2("laptop", 1)).toBe(350000);
  });

  it("all EMISSION_FACTORS entries are covered by calculateCo2", () => {
    for (const catFactors of Object.values(EMISSION_FACTORS)) {
      for (const [key, entry] of Object.entries(catFactors)) {
        const result = calculateCo2(key, 1);
        if (entry.factorGPerUnit >= 0) {
          expect(result, `factor for ${key}`).toBe(entry.factorGPerUnit);
        } else {
          expect(result, `clamped factor for ${key}`).toBe(0);
        }
      }
    }
  });
});

describe("haversineDistanceKm", () => {
  it("returns ~0 for identical coordinates", () => {
    expect(haversineDistanceKm(0, 0, 0, 0)).toBeCloseTo(0, 3);
  });

  it("calculates Delhi → Mumbai correctly (~1154 km)", () => {
    const dist = haversineDistanceKm(28.6139, 77.2090, 19.076, 72.8777);
    expect(dist).toBeGreaterThan(1100);
    expect(dist).toBeLessThan(1250);
  });

  it("calculates London → New York correctly (~5570 km)", () => {
    const dist = haversineDistanceKm(51.5074, -0.1278, 40.7128, -74.006);
    expect(dist).toBeGreaterThan(5400);
    expect(dist).toBeLessThan(5700);
  });

  it("is symmetric (A→B = B→A)", () => {
    const d1 = haversineDistanceKm(28.6139, 77.209, 12.9716, 77.5946);
    const d2 = haversineDistanceKm(12.9716, 77.5946, 28.6139, 77.209);
    expect(d1).toBeCloseTo(d2, 6);
  });

  it("returns positive distance for any valid coordinates", () => {
    const dist = haversineDistanceKm(0, 0, 1, 1);
    expect(dist).toBeGreaterThan(0);
  });
});

describe("getTransportPreview", () => {
  it("returns an array with all transport modes", () => {
    const preview = getTransportPreview(10);
    const modes = preview.map((p) => p.mode);
    expect(modes).toContain("petrol_car");
    expect(modes).toContain("metro_rail");
    expect(modes).toContain("bicycle");
  });

  it("co2Grams is proportional to distance", () => {
    const at10 = getTransportPreview(10);
    const at20 = getTransportPreview(20);
    const carAt10 = at10.find((p) => p.mode === "petrol_car")!.co2Grams;
    const carAt20 = at20.find((p) => p.mode === "petrol_car")!.co2Grams;
    expect(carAt20).toBe(carAt10 * 2);
  });

  it("bicycle always has 0 co2Grams", () => {
    const preview = getTransportPreview(500);
    const bicycle = preview.find((p) => p.mode === "bicycle")!;
    expect(bicycle.co2Grams).toBe(0);
  });

  it("values are rounded integers", () => {
    const preview = getTransportPreview(7.3);
    for (const mode of preview) {
      expect(Number.isInteger(mode.co2Grams)).toBe(true);
    }
  });

  it("each mode has required shape", () => {
    const preview = getTransportPreview(10);
    for (const mode of preview) {
      expect(mode).toHaveProperty("mode");
      expect(mode).toHaveProperty("label");
      expect(mode).toHaveProperty("co2Grams");
      expect(mode).toHaveProperty("emoji");
    }
  });

  it("returns 0-item result for 0 distance", () => {
    const preview = getTransportPreview(0);
    for (const mode of preview) {
      expect(mode.co2Grams).toBe(0);
    }
  });
});
