import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { validate } from "../../src/middleware/validate";

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    query: {},
    params: {},
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status, json } as unknown as Response, status, json };
}

describe("validate middleware", () => {
  const schema = z.object({ name: z.string().min(1), age: z.number().int().positive() });

  describe("body (default source)", () => {
    it("calls next() when body is valid", () => {
      const req = makeReq({ body: { name: "Alice", age: 30 } });
      const { res } = makeRes();
      const next = vi.fn() as unknown as NextFunction;

      validate(schema)(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(next).toHaveBeenCalledWith();
    });

    it("returns 400 when body is invalid", () => {
      const req = makeReq({ body: { name: "", age: -1 } });
      const { res, status, json } = makeRes();
      const next = vi.fn() as unknown as NextFunction;

      validate(schema)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Validation failed" }),
      );
    });

    it("returns 400 with issues array on failure", () => {
      const req = makeReq({ body: {} });
      const { res, json } = makeRes();
      const next = vi.fn() as unknown as NextFunction;

      validate(schema)(req, res, next);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ issues: expect.any(Array) }),
      );
    });

    it("mutates req.body with parsed (coerced) values on success", () => {
      const coercingSchema = z.object({ count: z.coerce.number() });
      const req = makeReq({ body: { count: "42" } });
      const { res } = makeRes();
      const next = vi.fn() as unknown as NextFunction;

      validate(coercingSchema)(req, res, next);

      expect((req.body as { count: number }).count).toBe(42);
    });

    it("strips unknown fields from body", () => {
      const req = makeReq({ body: { name: "Bob", age: 25, secret: "evil" } });
      const { res } = makeRes();
      const next = vi.fn() as unknown as NextFunction;

      validate(schema)(req, res, next);

      expect((req.body as { secret?: string }).secret).toBeUndefined();
    });
  });

  describe("query source", () => {
    it("calls next() when query is valid", () => {
      const querySchema = z.object({ limit: z.string().optional() });
      const req = makeReq({ query: { limit: "10" } } as Partial<Request>);
      const { res } = makeRes();
      const next = vi.fn() as unknown as NextFunction;

      validate(querySchema, "query")(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it("does NOT mutate req.query (Express 5 getter guard)", () => {
      const querySchema = z.object({ page: z.string().optional() });
      const originalQuery = { page: "1" };
      const req = makeReq({ query: originalQuery } as Partial<Request>);
      const { res } = makeRes();
      const next = vi.fn() as unknown as NextFunction;

      const queryDescriptor = Object.getOwnPropertyDescriptor(req, "query");
      validate(querySchema, "query")(req, res, next);

      // Descriptor should not have changed — we do not assign to req.query
      const afterDescriptor = Object.getOwnPropertyDescriptor(req, "query");
      expect(afterDescriptor).toEqual(queryDescriptor);
    });

    it("returns 400 when query validation fails", () => {
      const querySchema = z.object({ page: z.string().regex(/^\d+$/) });
      const req = makeReq({ query: { page: "abc" } } as Partial<Request>);
      const { res, status } = makeRes();
      const next = vi.fn() as unknown as NextFunction;

      validate(querySchema, "query")(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
    });
  });

  describe("params source", () => {
    it("calls next() and mutates req.params when valid", () => {
      const paramsSchema = z.object({ id: z.string().min(1) });
      const req = makeReq({ params: { id: "abc123" } } as Partial<Request>);
      const { res } = makeRes();
      const next = vi.fn() as unknown as NextFunction;

      validate(paramsSchema, "params")(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect((req.params as { id: string }).id).toBe("abc123");
    });

    it("returns 400 when params are invalid", () => {
      const paramsSchema = z.object({ id: z.string().min(10) });
      const req = makeReq({ params: { id: "short" } } as Partial<Request>);
      const { res, status } = makeRes();
      const next = vi.fn() as unknown as NextFunction;

      validate(paramsSchema, "params")(req, res, next);

      expect(status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
