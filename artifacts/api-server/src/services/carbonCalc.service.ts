/**
 * Carbon Calculation Engine
 * Uses IPCC AR6 2023 emission factors with regional grid data (India/Rajasthan/Global)
 */

export type Category = "TRANSPORT" | "FOOD" | "ENERGY" | "SHOPPING" | "WASTE";

export interface EmissionFactorEntry {
  factorGPerUnit: number;
  unit: string;
  label: string;
}

// TRANSPORT — gCO2e per passenger-km
export const EMISSION_FACTORS: Record<string, Record<string, EmissionFactorEntry & { category: Category }>> = {
  TRANSPORT: {
    petrol_car:          { factorGPerUnit: 192, unit: "km", label: "Petrol Car", category: "TRANSPORT" },
    diesel_car:          { factorGPerUnit: 171, unit: "km", label: "Diesel Car", category: "TRANSPORT" },
    motorcycle:          { factorGPerUnit: 103, unit: "km", label: "Motorcycle", category: "TRANSPORT" },
    bus:                 { factorGPerUnit: 89,  unit: "km", label: "Bus", category: "TRANSPORT" },
    metro_rail:          { factorGPerUnit: 41,  unit: "km", label: "Metro / Rail", category: "TRANSPORT" },
    domestic_flight:     { factorGPerUnit: 255, unit: "km", label: "Domestic Flight", category: "TRANSPORT" },
    international_flight:{ factorGPerUnit: 195, unit: "km", label: "International Flight", category: "TRANSPORT" },
    bicycle:             { factorGPerUnit: 0,   unit: "km", label: "Bicycle / Walking", category: "TRANSPORT" },
  },
  FOOD: {
    beef:           { factorGPerUnit: 99500, unit: "kg", label: "Beef", category: "FOOD" },
    lamb:           { factorGPerUnit: 39200, unit: "kg", label: "Lamb / Mutton", category: "FOOD" },
    pork:           { factorGPerUnit: 12100, unit: "kg", label: "Pork", category: "FOOD" },
    chicken:        { factorGPerUnit: 9870,  unit: "kg", label: "Chicken", category: "FOOD" },
    fish:           { factorGPerUnit: 5100,  unit: "kg", label: "Fish (wild-caught)", category: "FOOD" },
    dairy_milk:     { factorGPerUnit: 3200,  unit: "kg", label: "Dairy / Milk", category: "FOOD" },
    eggs:           { factorGPerUnit: 4500,  unit: "kg", label: "Eggs (per kg)", category: "FOOD" },
    rice:           { factorGPerUnit: 4450,  unit: "kg", label: "Rice (Indian paddy)", category: "FOOD" },
    legumes:        { factorGPerUnit: 2000,  unit: "kg", label: "Legumes / Pulses", category: "FOOD" },
    vegetables:     { factorGPerUnit: 980,   unit: "kg", label: "Vegetables (local)", category: "FOOD" },
    vegetables_imported: { factorGPerUnit: 2100, unit: "kg", label: "Vegetables (imported)", category: "FOOD" },
  },
  ENERGY: {
    electricity_india:     { factorGPerUnit: 820,   unit: "kWh", label: "Electricity (India avg)", category: "ENERGY" },
    electricity_rajasthan: { factorGPerUnit: 890,   unit: "kWh", label: "Electricity (Rajasthan)", category: "ENERGY" },
    natural_gas:           { factorGPerUnit: 2204,  unit: "m3", label: "Piped Natural Gas", category: "ENERGY" },
    lpg_cylinder:          { factorGPerUnit: 44100, unit: "unit", label: "LPG Cylinder (14.2 kg)", category: "ENERGY" },
  },
  SHOPPING: {
    cotton_tshirt: { factorGPerUnit: 10000,   unit: "item", label: "Cotton T-Shirt", category: "SHOPPING" },
    jeans:         { factorGPerUnit: 33000,   unit: "item", label: "Denim Jeans", category: "SHOPPING" },
    smartphone:    { factorGPerUnit: 70000,   unit: "item", label: "Smartphone (new)", category: "SHOPPING" },
    laptop:        { factorGPerUnit: 350000,  unit: "item", label: "Laptop (new)", category: "SHOPPING" },
  },
  WASTE: {
    landfill_waste: { factorGPerUnit: 467, unit: "kg", label: "Landfill Waste", category: "WASTE" },
    food_waste:     { factorGPerUnit: 990, unit: "kg", label: "Food Waste", category: "WASTE" },
    recycling:      { factorGPerUnit: -210, unit: "kg", label: "Recycling (offset)", category: "WASTE" },
  },
};

// Transport mode emission factors for route preview
export const TRANSPORT_MODE_FACTORS: Array<{
  mode: string;
  label: string;
  factorGPerKm: number;
  emoji: string;
}> = [
  { mode: "petrol_car",  label: "Petrol Car",   factorGPerKm: 192, emoji: "🚗" },
  { mode: "motorcycle",  label: "Motorcycle",   factorGPerKm: 103, emoji: "🏍" },
  { mode: "bus",         label: "Bus",          factorGPerKm: 89,  emoji: "🚌" },
  { mode: "metro_rail",  label: "Metro / Rail", factorGPerKm: 41,  emoji: "🚇" },
  { mode: "bicycle",     label: "Bicycle",      factorGPerKm: 0,   emoji: "🚲" },
];

/**
 * Calculate CO2 grams for an activity using stored emission factors.
 */
export function calculateCo2(
  subcategory: string,
  quantity: number,
): number {
  for (const catFactors of Object.values(EMISSION_FACTORS)) {
    if (catFactors[subcategory]) {
      const factor = catFactors[subcategory].factorGPerUnit;
      return Math.max(0, factor * quantity);
    }
  }
  // Unknown subcategory — return 0 rather than crash
  return 0;
}

/**
 * Calculate straight-line distance between two lat/lng pairs (Haversine).
 * Used as fallback when Google Routes API is unavailable.
 */
export function haversineDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getTransportPreview(distanceKm: number) {
  return TRANSPORT_MODE_FACTORS.map((m) => ({
    mode: m.mode,
    label: m.label,
    co2Grams: Math.round(m.factorGPerKm * distanceKm),
    emoji: m.emoji,
  }));
}
