import { logger } from "../lib/logger";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiInsightResult {
  insight_text: string;
  primary_driver: string;
  suggested_action: string;
  projected_annual_saving_kg: number;
}

const FALLBACK_INSIGHTS: GeminiInsightResult[] = [
  {
    insight_text:
      "Your transport emissions are your biggest driver this week. Switching to metro or bus for your daily commute can make a significant dent in your carbon footprint.",
    primary_driver: "transport",
    suggested_action:
      "Try metro or cycling for trips under 5 km — this alone can cut your transport footprint by 40% weekly.",
    projected_annual_saving_kg: 312,
  },
  {
    insight_text:
      "Food choices are driving most of your carbon this week. Reducing meat consumption, especially beef, has an outsized impact on your personal footprint.",
    primary_driver: "food",
    suggested_action:
      "Swapping two meat meals a week for legume-based dishes saves roughly 40 kg CO2e monthly — equivalent to planting a tree every week.",
    projected_annual_saving_kg: 480,
  },
  {
    insight_text:
      "Your energy use at home is contributing significantly. Simple habits like turning off appliances at the socket make a measurable difference.",
    primary_driver: "energy",
    suggested_action:
      "Reducing AC use by 1 hour/day and switching to LED lighting can cut your energy footprint by 15% without lifestyle sacrifice.",
    projected_annual_saving_kg: 145,
  },
  {
    insight_text:
      "Shopping emissions are higher than average this week. Fast fashion and new electronics have some of the highest lifecycle footprints per item.",
    primary_driver: "shopping",
    suggested_action:
      "Choose second-hand or refurbished electronics and clothing — buying one used item instead of new saves an average of 6 kg CO2e per purchase.",
    projected_annual_saving_kg: 120,
  },
];

export async function generatePersonalizedInsight(params: {
  totalKg: number;
  deltaPercent: number;
  direction: "up" | "down" | "same";
  breakdown: Record<string, number>;
  goalKg: number;
  topCategory: string;
}): Promise<GeminiInsightResult> {
  if (!GEMINI_API_KEY) {
    logger.warn("GEMINI_API_KEY not set — using fallback insight");
    return pickFallback(params.topCategory);
  }

  const breakdownText = Object.entries(params.breakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([k, v]) => `${k}: ${v.toFixed(2)} kg CO2e`)
    .join(", ");

  const trendLabel =
    params.direction === "up"
      ? `up ${params.deltaPercent.toFixed(1)}% vs last week ⚠️`
      : params.direction === "down"
        ? `down ${Math.abs(params.deltaPercent).toFixed(1)}% vs last week ✅`
        : "similar to last week";

  const prompt = `You are a carbon footprint intelligence analyst generating personalized weekly reports.

User carbon data:
- Total this week: ${params.totalKg.toFixed(2)} kg CO2e (${trendLabel})
- Weekly goal: ${params.goalKg} kg CO2e
- Status: ${params.totalKg <= params.goalKg ? "Under budget ✅" : `Over budget by ${(params.totalKg - params.goalKg).toFixed(1)} kg ⚠️`}
- Emissions breakdown: ${breakdownText}
- Primary driver: ${params.topCategory}

Generate a precise, personalized carbon insight. Respond ONLY with valid JSON:
{
  "insight_text": "string (50-80 words, mention specific numbers from their data, be direct and personal)",
  "primary_driver": "string (lowercase category name driving most emissions)",
  "suggested_action": "string (40-60 words, concrete and measurable action they can take)",
  "projected_annual_saving_kg": number (realistic kg CO2e saved per year if action taken, integer)
}`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 600,
          responseMimeType: "application/json",
        },
        systemInstruction: {
          parts: [
            {
              text: "You are a carbon footprint analyst. Always respond with valid JSON only. No markdown fences, no extra text.",
            },
          ],
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "unknown");
      throw new Error(`Gemini API ${res.status}: ${errBody}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };

    const rawText =
      json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = rawText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleaned) as GeminiInsightResult;

    if (
      !parsed.insight_text ||
      !parsed.primary_driver ||
      !parsed.suggested_action ||
      typeof parsed.projected_annual_saving_kg !== "number"
    ) {
      throw new Error("Gemini response missing required fields");
    }

    logger.info(
      { model: GEMINI_MODEL, driver: parsed.primary_driver },
      "Gemini insight generated",
    );
    return parsed;
  } catch (err) {
    logger.error({ err }, "Gemini API call failed — using fallback");
    return pickFallback(params.topCategory);
  }
}

function pickFallback(topCategory: string): GeminiInsightResult {
  const match = FALLBACK_INSIGHTS.find(
    (f) => f.primary_driver === topCategory.toLowerCase(),
  );
  return match ?? FALLBACK_INSIGHTS[0];
}
