import { Router } from "express";
import { EMISSION_FACTORS } from "../services/carbonCalc.service";

const router = Router();

router.get("/emission-factors", (_req, res) => {
  const result = Object.entries(EMISSION_FACTORS).flatMap(([category, factors]) =>
    Object.entries(factors).map(([subcategory, f]) => ({
      id: subcategory,
      category,
      subcategory,
      factorGPerUnit: f.factorGPerUnit,
      unit: f.unit,
      label: f.label,
      source: "IPCC AR6 2023 / CEA 2023",
    }))
  );
  res.json(result);
});

export default router;
