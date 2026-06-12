import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generatePersonalizedInsight } from "../../src/services/gemini.service";

const MOCK_PARAMS = {
  totalKg: 45.2,
  deltaPercent: 12,
  direction: "up" as const,
  breakdown: { transport: 22.1, food: 15.3, energy: 7.8 },
  goalKg: 40,
  topCategory: "transport",
};

const VALID_GEMINI_RESPONSE = {
  insight_text: "Your transport emissions of 22.1 kg dominate this week.",
  primary_driver: "transport",
  suggested_action: "Switch to metro for commutes under 10 km to cut 40% weekly.",
  projected_annual_saving_kg: 312,
};

function mockFetchSuccess(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(body) }],
          },
          finishReason: "STOP",
        },
      ],
    }),
    text: async () => "error body",
  } as unknown as Response);
};

describe("generatePersonalizedInsight", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key-123");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns a valid insight from Gemini on success", async () => {
    mockFetchSuccess(VALID_GEMINI_RESPONSE);
    const result = await generatePersonalizedInsight(MOCK_PARAMS);

    expect(result.insight_text).toBeTruthy();
    expect(result.primary_driver).toBeTruthy();
    expect(result.suggested_action).toBeTruthy();
    expect(typeof result.projected_annual_saving_kg).toBe("number");
  });

  it("calls Gemini API with the correct model URL", async () => {
    const spy = mockFetchSuccess(VALID_GEMINI_RESPONSE);
    await generatePersonalizedInsight(MOCK_PARAMS);

    const url = spy.mock.calls[0][0] as string;
    expect(url).toContain("gemini-2.5-flash");
    expect(url).toContain("generateContent");
  });

  it("includes temperature and maxOutputTokens in the request body", async () => {
    const spy = mockFetchSuccess(VALID_GEMINI_RESPONSE);
    await generatePersonalizedInsight(MOCK_PARAMS);

    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.generationConfig.temperature).toBeTypeOf("number");
    expect(body.generationConfig.maxOutputTokens).toBeGreaterThan(0);
  });

  it("returns a fallback when GEMINI_API_KEY is not set", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GEMINI_API_KEY", "");

    const result = await generatePersonalizedInsight(MOCK_PARAMS);

    expect(result.insight_text).toBeTruthy();
    expect(result.projected_annual_saving_kg).toBeGreaterThan(0);
  });

  it("falls back gracefully when fetch throws a network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    const result = await generatePersonalizedInsight(MOCK_PARAMS);

    expect(result.insight_text).toBeTruthy();
    expect(result.primary_driver).toBeTruthy();
  });

  it("falls back gracefully when Gemini returns non-OK status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "rate limited",
    } as unknown as Response);

    const result = await generatePersonalizedInsight(MOCK_PARAMS);

    expect(result.insight_text).toBeTruthy();
  });

  it("falls back gracefully when Gemini returns invalid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "not json at all {{" }] } }],
      }),
    } as unknown as Response);

    const result = await generatePersonalizedInsight(MOCK_PARAMS);

    expect(result.insight_text).toBeTruthy();
  });

  it("falls back gracefully when Gemini response is missing required fields", async () => {
    mockFetchSuccess({ insight_text: "Only one field" });

    const result = await generatePersonalizedInsight(MOCK_PARAMS);

    expect(result.insight_text).toBeTruthy();
    expect(result.primary_driver).toBeTruthy();
  });

  it("selects the correct fallback by topCategory when no API key", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GEMINI_API_KEY", "");

    const foodResult = await generatePersonalizedInsight({
      ...MOCK_PARAMS,
      topCategory: "food",
    });
    expect(foodResult.primary_driver).toBe("food");
  });

  it("projected_annual_saving_kg is a positive number in fallback", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GEMINI_API_KEY", "");

    const result = await generatePersonalizedInsight(MOCK_PARAMS);
    expect(result.projected_annual_saving_kg).toBeGreaterThan(0);
  });
});
