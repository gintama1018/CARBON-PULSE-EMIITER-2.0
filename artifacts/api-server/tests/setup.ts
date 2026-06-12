import { vi, afterAll, beforeAll } from "vitest";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";

beforeAll(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-key-mock");
});

afterAll(() => {
  vi.unstubAllEnvs();
});
